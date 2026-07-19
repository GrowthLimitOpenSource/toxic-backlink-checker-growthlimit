import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { runAudit } from "./lib/audit";

function argument(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
async function main() {
  const target = argument("--domain") || argument("--target");
  if (!target) { console.error("Usage: npm run audit -- --domain example.com [--max-backlinks 25000] [--inspect-pages 100] [--existing-disavow ./current.txt] [--llm]"); process.exitCode = 1; return; }
  const existing = argument("--existing-disavow");
  const report = await runAudit({ target, maxBacklinks: Number(argument("--max-backlinks") || 25000), inspectPages: Number(argument("--inspect-pages") || 100), existingDisavow: existing ? await readFile(existing, "utf8") : "", useLlm: process.argv.includes("--llm") });
  const output = path.resolve(argument("--output") || `./reports/${report.target}`);
  await mkdir(output, { recursive: true });
  await Promise.all([writeFile(path.join(output, "audit.json"), JSON.stringify(report, null, 2)), writeFile(path.join(output, "draft-disavow.txt"), report.proposedDisavow)]);
  console.log(`Audit complete: ${report.source.rowsRetrieved} rows, ${report.groups.length} referring domains, $${(report.source.cost || 0).toFixed(4)} DataForSEO cost.`);
  console.log(`Reports: ${output}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
