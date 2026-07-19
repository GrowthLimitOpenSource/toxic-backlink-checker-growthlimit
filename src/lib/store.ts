import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuditReport, AuditSummary } from "./types";

const directory = path.resolve(process.env.AUDIT_DATA_DIR || "data/audits");

export async function saveAudit(report: AuditReport): Promise<void> {
  await mkdir(directory, { recursive: true });
  const finalPath = filePath(report.id);
  const temporary = `${finalPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(report, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, finalPath);
}

export async function getAudit(id: string): Promise<AuditReport | null> {
  if (!/^[a-zA-Z0-9.-]+$/.test(id)) return null;
  try { return hydrate(JSON.parse(await readFile(filePath(id), "utf8")) as AuditReport); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

export async function listAudits(): Promise<AuditSummary[]> {
  await mkdir(directory, { recursive: true });
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json"));
  const reports = await Promise.all(files.map((name) => getAudit(name.slice(0, -5))));
  return reports.filter((report): report is AuditReport => Boolean(report)).map((report) => ({
    id: report.id,
    target: report.target,
    createdAt: report.createdAt,
    groupCount: report.groups.length,
    reviewCount: report.groups.filter((group) => group.classification === "REVIEW").length,
    approvedCount: report.groups.filter((group) => group.approved).length,
    sourceNames: [...new Set(report.groups.flatMap((group) => group.sourceNames))],
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateAudit(id: string, updater: (report: AuditReport) => AuditReport): Promise<AuditReport | null> {
  const current = await getAudit(id);
  if (!current) return null;
  const next = updater(current);
  await saveAudit(next);
  return next;
}

function hydrate(report: AuditReport): AuditReport {
  report.imports ||= [];
  report.options.includeDataForSeo ??= true;
  for (const group of report.groups) {
    for (const link of group.links) link.sources ||= ["DataForSEO"];
    group.sourceNames ||= [...new Set(group.links.flatMap((link) => link.sources))];
    group.decisionHistory ||= [];
  }
  return report;
}
export async function deleteAudit(id: string): Promise<void> {
  if (!/^[a-zA-Z0-9.-]+$/.test(id)) return;
  try { await unlink(filePath(id)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}


function filePath(id: string) { return path.join(directory, `${id}.json`); }
