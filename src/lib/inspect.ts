import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";
import type { BacklinkRow, PageInspection } from "./types";

const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain", "metadata.google.internal", "169.254.169.254"]);

function blockedAddress(address: string): boolean {
  if (address === "::1" || address === "::" || address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true;
  const p = address.split(".").map(Number);
  return p.length === 4 && (p[0] === 10 || p[0] === 127 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || p[0] === 0);
}

async function assertPublic(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are permitted.");
  if (url.username || url.password) throw new Error("Credential-bearing URLs are blocked.");
  if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) throw new Error("Private or metadata host blocked.");
  const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((x) => blockedAddress(x.address))) throw new Error("Hostname resolves to a private or unsafe address.");
}

async function fetchLimited(start: string, timeoutMs: number, maximumBytes: number) {
  let current = new URL(start);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    await assertPublic(current);
    const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs), headers: { "User-Agent": "GrowthLimit-Toxic-Backlink-Checker/1.0 (+https://www.growthlimit.com/tools/toxic-backlink-checker)" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect did not include a destination.");
      current = new URL(location, current);
      continue;
    }
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > maximumBytes) throw new Error("Response exceeds configured byte limit.");
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) { await reader.cancel(); throw new Error("Response exceeds configured byte limit."); }
      chunks.push(value);
    }
    return { response, finalUrl: current.toString(), html: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  throw new Error("Too many redirects.");
}

export async function inspectBacklink(link: BacklinkRow, timeoutMs: number, maximumBytes: number): Promise<PageInspection> {
  const base = { requestedUrl: link.urlFrom, finalUrl: null, status: null, title: null, linkFound: false, rel: [] as string[], anchor: null, surroundingText: null, blockedReason: null, fetchedAt: new Date().toISOString() };
  try {
    const { response, finalUrl, html } = await fetchLimited(link.urlFrom, timeoutMs, maximumBytes);
    const $ = cheerio.load(html);
    const targetHost = new URL(link.urlTo).hostname.replace(/^www\./, "");
    const match = $("a[href]").toArray().find((el) => { try { return new URL($(el).attr("href") || "", finalUrl).hostname.replace(/^www\./, "") === targetHost; } catch { return false; } });
    const node = match ? $(match) : null;
    return { ...base, finalUrl, status: response.status, title: $("title").first().text().trim() || null, linkFound: Boolean(match), rel: (node?.attr("rel") || "").split(/\s+/).filter(Boolean), anchor: node?.text().replace(/\s+/g, " ").trim() || null, surroundingText: node?.parent().text().replace(/\s+/g, " ").trim().slice(0, 500) || null };
  } catch (error) {
    return { ...base, blockedReason: error instanceof Error ? error.message : "Inspection failed." };
  }
}
