import { hostname } from "./dataforseo";
import type { BacklinkRow, ImportFile, ImportSource, ImportSummary } from "./types";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 2_000_000;
const MAX_TOTAL_BYTES = 5_000_000;
const MAX_ROWS = 50_000;

const aliases = {
  sourceUrl: ["sourcepage", "sourceurl", "referringpageurl", "referringurl", "urlfrom", "fromurl", "linkingpage", "pageurl"],
  targetUrl: ["targetpage", "targeturl", "destinationurl", "urlto", "tourl", "linkedpage"],
  sourceDomain: ["sourcedomain", "referringdomain", "domainfrom", "linkingdomain"],
  targetDomain: ["targetdomain", "domainto", "destinationdomain"],
  anchor: ["anchor", "anchortext", "linkanchor"],
  textPre: ["textpre", "leftcontext", "contextbefore"],
  textPost: ["textpost", "rightcontext", "contextafter"],
  dofollow: ["dofollow", "follow", "isfollow", "followed"],
  nofollow: ["nofollow", "flagnofollow", "isnofollow"],
  linkType: ["linktype", "type", "rel", "linkattribute"],
  firstSeen: ["firstseen", "datefirstseen", "firstindexeddate", "firstseencheck"],
  lastSeen: ["lastseen", "datelastseen", "lastseendate", "lastcrawl", "lastseencheck"],
  isNew: ["isnew", "new"],
  isLost: ["islost", "lost", "status"],
  rank: ["rank", "urlrating", "pagerating", "sourcecitationflow"],
  domainRank: ["domainrank", "domainrating", "domainauthority", "sourcetrustflow", "pageascore", "authorityscore"],
  pageRank: ["pagerank", "pageauthority", "urlscore"],
} as const;

export function importBacklinkFiles(files: ImportFile[], target?: string, includeSubdomains = true): { rows: BacklinkRow[]; summaries: ImportSummary[]; warnings: string[] } {
  if (files.length > MAX_FILES) throw new Error(`Import at most ${MAX_FILES} CSV files per audit.`);
  const totalBytes = files.reduce((sum, file) => sum + Buffer.byteLength(file.content, "utf8"), 0);
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error("Imported CSV files exceed the 5 MB combined limit.");

  const rows: BacklinkRow[] = [];
  const summaries: ImportSummary[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".csv")) throw new Error(`${safeName(file.name)} is not a CSV file.`);
    if (Buffer.byteLength(file.content, "utf8") > MAX_FILE_BYTES) throw new Error(`${safeName(file.name)} exceeds the 2 MB file limit.`);
    const records = parseCsv(file.content);
    if (records.length < 2) throw new Error(`${safeName(file.name)} does not contain a header and data row.`);

    const headers = records[0].map(normalizeHeader);
    const source = detectSource(file.name, headers);
    let accepted = 0;
    let rejected = 0;

    for (const values of records.slice(1)) {
      if (rows.length >= MAX_ROWS) throw new Error(`Imported backlink rows exceed the ${MAX_ROWS.toLocaleString()} row limit.`);
      if (values.every((value) => !value.trim())) continue;
      const raw = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""]));
      const urlFrom = pick(raw, aliases.sourceUrl);
      const urlTo = pick(raw, aliases.targetUrl);
      if (!isHttpUrl(urlFrom) || !isHttpUrl(urlTo)) { rejected += 1; continue; }
      const domainFrom = hostname(urlFrom);
      const domainTo = hostname(urlTo);
      if (!domainFrom || !domainTo || (target && domainTo !== target && (!includeSubdomains || !domainTo.endsWith(`.${target}`)))) { rejected += 1; continue; }
      rows.push({
        urlFrom,
        urlTo,
        domainFrom,
        domainTo,
        anchor: pick(raw, aliases.anchor),
        textPre: pick(raw, aliases.textPre),
        textPost: pick(raw, aliases.textPost),
        dofollow: followValue(raw),
        isNew: booleanValue(pick(raw, aliases.isNew)) === true,
        isLost: lostValue(pick(raw, aliases.isLost)),
        firstSeen: pick(raw, aliases.firstSeen) || null,
        lastSeen: pick(raw, aliases.lastSeen) || null,
        rank: numberValue(pick(raw, aliases.rank)),
        domainRank: numberValue(pick(raw, aliases.domainRank)),
        pageRank: numberValue(pick(raw, aliases.pageRank)),
        source: raw,
        sources: [source],
      });
      accepted += 1;
    }

    summaries.push({ fileName: safeName(file.name), source, rowsRead: records.length - 1, rowsAccepted: accepted, rowsRejected: rejected });
    if (rejected) warnings.push(`${safeName(file.name)}: ${rejected} row(s) were skipped because source or target HTTP URLs were missing, invalid, or outside the audited domain.`);
  }

  return { rows, summaries, warnings };
}

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const text = input.replace(/^\uFEFF/, "");

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(value); value = ""; }
    else if (char === "\n") { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (value || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

function detectSource(fileName: string, headers: string[]): ImportSource {
  const signature = `${fileName.toLowerCase()} ${headers.join(" ")}`;
  if (signature.includes("ahrefs") || headers.includes("referringpageurl")) return "Ahrefs";
  if (signature.includes("semrush") || headers.includes("pageascore")) return "Semrush";
  if (signature.includes("majestic") || headers.includes("sourcetrustflow") || headers.includes("sourcecitationflow")) return "Majestic";
  if (signature.includes("moz") || headers.includes("domainauthority") || headers.includes("spamcore")) return "Moz";
  if (signature.includes("search console") || signature.includes("gsc") || (headers.includes("sourcepage") && headers.includes("lastcrawl"))) return "Google Search Console";
  return "Generic CSV";
}

function followValue(row: Record<string, string>): boolean | null {
  const direct = booleanValue(pick(row, aliases.dofollow));
  if (direct !== null) return direct;
  const nofollow = booleanValue(pick(row, aliases.nofollow));
  if (nofollow !== null) return !nofollow;
  const type = pick(row, aliases.linkType).toLowerCase();
  if (!type) return null;
  if (/nofollow|sponsored|ugc/.test(type)) return false;
  if (/dofollow|follow/.test(type)) return true;
  return null;
}

function lostValue(value: string): boolean {
  if (/lost|removed|deleted/i.test(value)) return true;
  return booleanValue(value) === true;
}

function booleanValue(value: string): boolean | null {
  if (/^(true|yes|y|1|follow|dofollow)$/i.test(value)) return true;
  if (/^(false|no|n|0|nofollow)$/i.test(value)) return false;
  return null;
}

function numberValue(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function pick(row: Record<string, string>, names: readonly string[]): string {
  for (const name of names) if (row[name]) return row[name];
  return "";
}

function normalizeHeader(value: string): string { return value.trim().toLowerCase().replace(/[^a-z0-9]/g, ""); }
function safeName(value: string): string { return value.replace(/[\r\n]/g, " ").slice(0, 200) || "unnamed.csv"; }
function isHttpUrl(value: string): boolean { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } }
