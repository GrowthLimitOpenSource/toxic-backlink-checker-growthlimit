import { getAudit } from "@/lib/store";

function csvCell(value: unknown) { const text = typeof value === "string" ? value : JSON.stringify(value); return `"${text.replaceAll('"', '""')}"`; }
export async function GET(_: Request, { params }: { params: Promise<{ id: string; format: string }> }) {
  const { id, format } = await params;
  const report = await getAudit(id);
  if (format === "json") return file(JSON.stringify(report, null, 2), "application/json", `${report.target}-audit.json`);
  if (format === "txt") return file(report.proposedDisavow, "text/plain", `${report.target}-draft-disavow.txt`);
  if (format === "csv") {
    const header = ["domain", "classification", "approved", "confidence", "links", "follow_links", "top_anchor", "evidence", "note"];
    const rows = report.groups.map((g) => [g.domain, g.classification, g.approved, g.confidence, g.links.length, g.followCount, g.anchors[0]?.value || "", g.evidence.map((e) => `${e.code}: ${e.detail}`).join(" | "), g.note]);
    return file([header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv", `${report.target}-audit.csv`);
  }
  if (format === "html") {
    const groups = report.groups.map((g) => `<tr><td>${escape(g.domain)}</td><td>${g.classification}</td><td>${g.links.length}</td><td>${Math.round(g.confidence * 100)}%</td><td>${escape(g.evidence.map((e) => e.label).join(", ") || "No risk cluster")}</td></tr>`).join("");
    return file(`<!doctype html><meta charset="utf-8"><title>${escape(report.target)} backlink audit</title><style>body{font:16px system-ui;max-width:1200px;margin:40px auto;padding:0 20px;color:#172033}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #ccd;text-align:left}th{background:#f4efe4}</style><h1>${escape(report.target)} backlink audit</h1><p>Generated ${escape(report.createdAt)}. ${report.source.rowsRetrieved} rows from DataForSEO. Human review required.</p><table><thead><tr><th>Domain</th><th>Classification</th><th>Links</th><th>Confidence</th><th>Evidence</th></tr></thead><tbody>${groups}</tbody></table>`, "text/html", `${report.target}-audit.html`);
  }
  return new Response("Unknown format", { status: 404 });
}
function file(body: string, type: string, name: string) { return new Response(body, { headers: { "Content-Type": `${type}; charset=utf-8`, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } }); }
function escape(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!); }
