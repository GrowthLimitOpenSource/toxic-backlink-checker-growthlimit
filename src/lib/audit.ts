import pLimit from "p-limit";
import { DataForSeoClient } from "./dataforseo";
import { inspectBacklink } from "./inspect";
import { parseDisavow, renderDisavow } from "./disavow";
import { saveAudit } from "./store";
import { reviewWithLlm } from "./llm";
import type { AuditOptions, AuditReport, BacklinkRow, DomainGroup, Evidence } from "./types";

const VERSION = "1.0.0";
const RULES = "2026-07-19";
const DEFAULT_COMMERCIAL = ["buy", "cheap", "best", "agency", "services", "casino", "loan", "payday", "viagra", "crypto"];

export function normalizeOptions(input: Partial<AuditOptions> & { target: string }): AuditOptions {
  const target = input.target.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  if (!target || !target.includes(".") || target.includes(" ")) throw new Error("Enter a valid root domain such as example.com.");
  return {
    target, includeSubdomains: input.includeSubdomains ?? true,
    maxBacklinks: clamp(input.maxBacklinks ?? 25_000, 1, Number(process.env.MAX_BACKLINK_ROWS || 25_000)),
    inspectPages: clamp(input.inspectPages ?? 100, 0, Number(process.env.MAX_PAGES_TO_INSPECT || 500)),
    concurrency: clamp(input.concurrency ?? 5, 1, Number(process.env.MAX_CONCURRENT_FETCHES || 5)),
    fetchTimeoutMs: clamp(input.fetchTimeoutMs ?? 10_000, 1000, Number(process.env.FETCH_TIMEOUT_MS || 10_000)),
    maxResponseBytes: clamp(input.maxResponseBytes ?? 2_000_000, 50_000, Number(process.env.MAX_RESPONSE_BYTES || 2_000_000)),
    commercialTerms: input.commercialTerms?.length ? input.commercialTerms.map((x) => x.toLowerCase()) : DEFAULT_COMMERCIAL,
    existingDisavow: input.existingDisavow || "", useLlm: input.useLlm ?? false,
  };
}
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, Math.floor(value))); }

export function groupBacklinks(rows: BacklinkRow[], options: AuditOptions): DomainGroup[] {
  const unique = new Map<string, BacklinkRow>();
  for (const row of rows) unique.set(`${row.urlFrom}\n${row.urlTo}\n${row.anchor}`, row);
  const grouped = new Map<string, BacklinkRow[]>();
  for (const row of unique.values()) {
    if (!row.domainFrom || row.domainFrom === options.target || row.domainFrom.endsWith(`.${options.target}`)) continue;
    grouped.set(row.domainFrom, [...(grouped.get(row.domainFrom) || []), row]);
  }
  return [...grouped.entries()].map(([domain, links]) => classify(domain, links, options)).sort((a, b) => risk(b) - risk(a));
}

function distributions(values: string[]) {
  const counts = new Map<string, number>();
  for (const raw of values) { const value = raw.trim().toLowerCase() || "[empty]"; counts.set(value, (counts.get(value) || 0) + 1); }
  return [...counts].map(([value, count]) => ({ value, count, share: count / values.length })).sort((a, b) => b.count - a.count);
}
function evidence(code: string, label: string, detail: string, weight: number, kind: Evidence["kind"] = "risk"): Evidence { return { code, label, detail, weight, kind }; }

function classify(domain: string, links: BacklinkRow[], options: AuditOptions): DomainGroup {
  const anchors = distributions(links.map((x) => x.anchor));
  const targets = distributions(links.map((x) => x.urlTo));
  const ev: Evidence[] = [];
  const topAnchor = anchors[0];
  const commercial = anchors.filter((x) => options.commercialTerms.some((term) => x.value.includes(term))).reduce((n, x) => n + x.count, 0);
  if (links.length >= 20 && topAnchor?.share >= 0.7 && topAnchor.value !== "[empty]") ev.push(evidence("REPEATED_ANCHOR", "Repeated anchor cluster", `${Math.round(topAnchor.share * 100)}% of ${links.length} links use “${topAnchor.value}”.`, 3));
  if (commercial / links.length >= 0.5) ev.push(evidence("COMMERCIAL_ANCHORS", "Commercial anchor concentration", `${Math.round(commercial / links.length * 100)}% of links contain configured commercial terms.`, 3));
  if (links.length >= 50 && targets.length <= 2) ev.push(evidence("SITEWIDE_PATTERN", "Sitewide link pattern", `${links.length} links point to ${targets.length} target page(s).`, 2));
  if (links.some((x) => /\.(xyz|top|click|work|loan|casino)$/i.test(x.domainFrom))) ev.push(evidence("SUSPICIOUS_TLD", "Review-priority TLD", "The referring domain uses a TLD commonly seen in abuse; this is not proof of manipulation.", 1));
  const lost = links.filter((x) => x.isLost).length;
  if (lost / links.length >= 0.8) ev.push(evidence("MOSTLY_LOST", "Mostly lost links", `${Math.round(lost / links.length * 100)}% are reported lost.`, 0, "context"));
  if (links.every((x) => !x.dofollow)) ev.push(evidence("NOFOLLOW_ONLY", "All links are qualified", "All links are reported nofollow or otherwise non-following.", -2, "protective"));
  const score = ev.reduce((n, x) => n + x.weight, 0);
  const classification = score >= 6 ? "REVIEW" : "KEEP";
  return { domain, links, anchors, targets, followCount: links.filter((x) => x.dofollow).length, sitewideTargets: targets.length, evidence: ev, classification, confidence: classification === "KEEP" ? Math.min(0.9, 0.55 + Math.abs(score) * 0.08) : Math.min(0.85, 0.5 + score * 0.05), humanChecks: classification === "REVIEW" ? ["Confirm whether a prior vendor, owner, or campaign acquired these links.", "Open the representative linking page and verify placement and surrounding context.", "Check Search Console for an unnatural-links manual action."] : [], note: classification === "KEEP" ? "No deterministic evidence cluster justifies removal." : "Evidence supports investigation, not automatic disavowal.", approved: false };
}
function risk(group: DomainGroup) { return group.evidence.reduce((n, x) => n + x.weight, 0); }

export async function runAudit(raw: Partial<AuditOptions> & { target: string }): Promise<AuditReport> {
  const options = normalizeOptions(raw);
  const client = new DataForSeoClient();
  const summary = await client.summary(options.target, options.includeSubdomains);
  const rows = await client.backlinks(options.target, options.includeSubdomains, options.maxBacklinks);
  let groups = groupBacklinks(rows, options);
  const candidates = groups.filter((x) => x.classification === "REVIEW").slice(0, options.inspectPages);
  const limit = pLimit(options.concurrency);
  await Promise.all(candidates.map((group) => limit(async () => { group.inspection = await inspectBacklink(group.links[0], options.fetchTimeoutMs, options.maxResponseBytes); if (group.inspection.blockedReason) group.evidence.push(evidence("INSPECTION_FAILED", "Page inspection unavailable", group.inspection.blockedReason, 0, "context")); } )));
  if (options.useLlm) groups = await reviewWithLlm(groups);
  const existingDisavow = parseDisavow(options.existingDisavow || "", options.target);
  const report: AuditReport = { id: `${Date.now()}-${options.target.replace(/[^a-z0-9.-]/g, "")}`, applicationVersion: VERSION, ruleSetVersion: RULES, createdAt: new Date().toISOString(), target: options.target, options, source: { provider: "DataForSEO", endpoint: "Backlinks API live", rowsRetrieved: rows.length, cost: client.cost, tasks: client.taskCount }, summary, groups, existingDisavow, proposedDisavow: renderDisavow(groups, existingDisavow), warnings: ["DataForSEO index coverage differs from Search Console and other vendors.", "Vendor metrics and automated rules are investigation signals, not proof that Google counts a link or that a link caused ranking changes.", "A new disavow upload replaces the prior file; preserve and review it before upload."], llm: { enabled: options.useLlm, provider: options.useLlm ? process.env.LLM_PROVIDER || "openai-compatible" : null, model: options.useLlm ? process.env.LLM_MODEL || "gpt-5-mini" : null, groupsReviewed: options.useLlm ? groups.filter((x) => x.classification === "REVIEW").length : 0 } };
  await saveAudit(report);
  return report;
}
