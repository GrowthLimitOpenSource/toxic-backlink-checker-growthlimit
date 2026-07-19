import type { BacklinkRow } from "./types";

const API = "https://api.dataforseo.com/v3";
const PAGE_SIZE = 1000;

interface ApiEnvelope { tasks?: Array<{ status_code: number; status_message: string; cost?: number; result?: Array<Record<string, unknown>> }> }

export class DataForSeoClient {
  private auth: string;
  public cost = 0;
  public taskCount = 0;

  constructor(login = process.env.DATAFORSEO_LOGIN, password = process.env.DATAFORSEO_PASSWORD) {
    if (!login || !password) throw new Error("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are required.");
    this.auth = Buffer.from(`${login}:${password}`).toString("base64");
  }

  private async post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const response = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { Authorization: `Basic ${this.auth}`, "Content-Type": "application/json" },
      body: JSON.stringify([body]),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`DataForSEO returned HTTP ${response.status}.`);
    const envelope = (await response.json()) as ApiEnvelope;
    const task = envelope.tasks?.[0];
    if (!task) throw new Error("DataForSEO returned no task.");
    this.taskCount += 1;
    this.cost += task.cost ?? 0;
    if (task.status_code >= 40000) throw new Error(`DataForSEO ${task.status_code}: ${task.status_message}`);
    return task.result ?? [];
  }

  async summary(target: string, includeSubdomains: boolean) {
    const results = await this.post("/backlinks/summary/live", { target, include_subdomains: includeSubdomains, rank_scale: "one_hundred" });
    return results[0] ?? null;
  }

  async backlinks(target: string, includeSubdomains: boolean, maximum: number): Promise<BacklinkRow[]> {
    const rows: BacklinkRow[] = [];
    for (let offset = 0; offset < maximum; offset += PAGE_SIZE) {
      const limit = Math.min(PAGE_SIZE, maximum - offset);
      const result = await this.post("/backlinks/backlinks/live", {
        target, include_subdomains: includeSubdomains, limit, offset,
        rank_scale: "one_hundred", order_by: ["rank,desc"],
      });
      const items = Array.isArray(result[0]?.items) ? result[0].items as Record<string, unknown>[] : [];
      rows.push(...items.map(normalizeVendorRow));
      if (items.length < limit) break;
    }
    return rows;
  }
}

function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function num(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function bool(value: unknown): boolean { return value === true || value === 1; }

export function normalizeVendorRow(row: Record<string, unknown>): BacklinkRow {
  const urlFrom = text(row.url_from);
  const urlTo = text(row.url_to);
  return {
    urlFrom, urlTo,
    domainFrom: text(row.domain_from) || hostname(urlFrom),
    domainTo: text(row.domain_to) || hostname(urlTo),
    anchor: text(row.anchor),
    textPre: text(row.text_pre),
    textPost: text(row.text_post),
    dofollow: bool(row.dofollow), isNew: bool(row.is_new), isLost: bool(row.is_lost),
    firstSeen: text(row.first_seen) || null, lastSeen: text(row.last_seen) || null,
    rank: num(row.rank), domainRank: num(row.domain_from_rank), pageRank: num(row.page_from_rank), source: row, sources: ["DataForSEO"],
  };
}

export function hostname(value: string): string {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}
