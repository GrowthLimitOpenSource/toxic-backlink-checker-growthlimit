import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuditReport } from "./types";

const dataDir = path.join(process.cwd(), "data", "audits");
function safeId(id: string) { if (!/^[a-zA-Z0-9.-]+$/.test(id)) throw new Error("Invalid audit ID."); return id; }

export async function saveAudit(report: AuditReport) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(path.join(dataDir, `${safeId(report.id)}.json`), JSON.stringify(report, null, 2), { mode: 0o600 });
}
export async function getAudit(id: string): Promise<AuditReport> { return JSON.parse(await readFile(path.join(dataDir, `${safeId(id)}.json`), "utf8")) as AuditReport; }
export async function listAudits(): Promise<Array<Pick<AuditReport, "id" | "target" | "createdAt">>> {
  await mkdir(dataDir, { recursive: true });
  const files = (await readdir(dataDir)).filter((x) => x.endsWith(".json"));
  const reports = await Promise.all(files.map(async (file) => getAudit(file.slice(0, -5))));
  return reports.map(({ id, target, createdAt }) => ({ id, target, createdAt })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function deleteAudit(id: string) { await rm(path.join(dataDir, `${safeId(id)}.json`)); }
