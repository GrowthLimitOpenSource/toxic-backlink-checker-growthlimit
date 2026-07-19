"use client";

import { FormEvent, useEffect, useState } from "react";
import type { AuditComparison, AuditReport, AuditSummary, Classification, DomainGroup, ImportFile } from "@/lib/types";

export default function Home() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [comparison, setComparison] = useState<AuditComparison | null>(null);
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void refreshHistory(); }, []);

  async function refreshHistory() {
    const response = await fetch("/api/audits");
    if (response.ok) setAudits(await response.json());
  }

  async function loadAudit(id: string) {
    setLoading(true); setError("");
    const [reportResponse, comparisonResponse] = await Promise.all([fetch(`/api/audits/${id}`), fetch(`/api/audits/${id}/compare`)]);
    if (!reportResponse.ok) setError("The saved audit could not be loaded.");
    else {
      setReport(await reportResponse.json());
      setComparison(comparisonResponse.ok ? await comparisonResponse.json() : null);
    }
    setLoading(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setComparison(null);
    const form = new FormData(event.currentTarget);
    try {
      const selectedFiles = form.getAll("imports").filter((value): value is File => value instanceof File && value.size > 0);
      const importFiles: ImportFile[] = await Promise.all(selectedFiles.map(async (file) => ({ name: file.name, content: await file.text() })));
      const body = {
        target: form.get("target"),
        maxBacklinks: Number(form.get("maxBacklinks")),
        inspectPages: Number(form.get("inspectPages")),
        includeSubdomains: form.get("includeSubdomains") === "on",
        includeDataForSeo: form.get("includeDataForSeo") === "on",
        useLlm: form.get("useLlm") === "on",
        existingDisavow: form.get("existingDisavow"),
        importFiles,
      };
      const response = await fetch("/api/audits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok) setError(json.error || "Audit failed.");
      else {
        setReport(json.report);
        const compareResponse = await fetch(`/api/audits/${json.report.id}/compare`);
        if (compareResponse.ok) setComparison(await compareResponse.json());
        await refreshHistory();
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Audit failed."); }
    setLoading(false);
  }

  async function update(group: DomainGroup, classification: Classification, approved: boolean) {
    if (!report) return;
    const response = await fetch(`/api/audits/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: group.domain, classification, approved }) });
    if (response.ok) {
      const next = await response.json(); setReport(next);
      const compareResponse = await fetch(`/api/audits/${report.id}/compare`);
      if (compareResponse.ok) setComparison(await compareResponse.json());
      await refreshHistory();
    } else setError("The decision could not be saved.");
  }

  return <main>
    <header className="border-b border-white/10 bg-[#10233f] text-white"><div className="mx-auto max-w-6xl px-6 py-16"><p className="mb-4 text-sm font-semibold uppercase tracking-[.22em] text-[#d6aa4b]">Open-source, local-first audit</p><h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">Toxic Backlink Checker by GrowthLimit.com</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-white/75">Combine DataForSEO with Search Console, Ahrefs, Semrush, Majestic, Moz, or generic CSV exports. Reconcile evidence, compare audits over time, and export a human-reviewed draft. Nothing is uploaded to Growth Limit.</p><div className="mt-7 flex flex-wrap gap-4 text-sm"><a className="rounded bg-[#d6aa4b] px-5 py-3 font-semibold text-[#10233f]" href="https://www.growthlimit.com/tools/toxic-backlink-checker">Setup guide</a><a className="rounded border border-white/30 px-5 py-3" href="https://github.com/GrowthLimitOpenSource/toxic-backlink-checker-growthlimit">Source code</a></div></div></header>
    <section className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-6">
        <form onSubmit={submit} className="h-fit space-y-5 rounded-xl border border-[#d7d0c4] bg-white p-6 shadow-sm">
          <div><h2 className="text-2xl font-semibold">Start an audit</h2><p className="mt-2 text-sm text-slate-600">Use DataForSEO, imported CSV evidence, or both. Duplicate links merge while preserving every reporting source.</p></div>
          <Field label="Domain"><input required name="target" placeholder="example.com" /></Field>
          <label className="flex gap-3 text-sm"><input name="includeDataForSeo" type="checkbox" defaultChecked /> Retrieve current DataForSEO backlinks</label>
          <div className="grid grid-cols-2 gap-4"><Field label="Maximum API rows"><input name="maxBacklinks" type="number" min="1" max="25000" defaultValue="25000" /></Field><Field label="Pages to inspect"><input name="inspectPages" type="number" min="0" max="500" defaultValue="100" /></Field></div>
          <Field label="Additional backlink CSV files"><input name="imports" type="file" accept=".csv,text/csv" multiple /><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Up to 10 files, 2 MB each and 5 MB combined. Supports Search Console, Ahrefs, Semrush, Majestic, Moz, and common source/target URL columns.</span></Field>
          <label className="flex gap-3 text-sm"><input name="includeSubdomains" type="checkbox" defaultChecked /> Include subdomains</label><label className="flex gap-3 text-sm"><input name="useLlm" type="checkbox" /> Optional LLM evidence summaries</label>
          <Field label="Existing disavow file (recommended)"><textarea name="existingDisavow" rows={6} placeholder="# Paste the complete current file here&#10;domain:spam-example.com" /></Field>
          <button disabled={loading} className="w-full rounded bg-[#10233f] px-5 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Retrieving and reconciling…" : "Run backlink audit"}</button>
          {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </form>
        <History audits={audits} activeId={report?.id} load={loadAudit} />
      </div>
      <div className="min-w-0">{report ? <Results report={report} comparison={comparison} update={update} /> : <Empty />}</div>
    </section>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}<div className="mt-2 [&_input]:w-full [&_input]:rounded [&_input]:border [&_input]:border-slate-300 [&_input]:px-3 [&_input]:py-2 [&_textarea]:w-full [&_textarea]:rounded [&_textarea]:border [&_textarea]:border-slate-300 [&_textarea]:px-3 [&_textarea]:py-2">{children}</div></label>; }

function History({ audits, activeId, load }: { audits: AuditSummary[]; activeId?: string; load: (id: string) => void }) {
  return <section className="rounded-xl border border-[#d7d0c4] bg-white p-6"><h2 className="text-xl font-semibold">Audit history</h2>{audits.length === 0 ? <p className="mt-3 text-sm text-slate-600">Completed audits appear here for repeat review and change comparison.</p> : <div className="mt-4 space-y-2">{audits.slice(0, 12).map((audit) => <button type="button" key={audit.id} onClick={() => load(audit.id)} className={`w-full rounded border p-3 text-left text-sm ${activeId === audit.id ? "border-[#d6aa4b] bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}><strong className="block">{audit.target}</strong><span className="mt-1 block text-xs text-slate-500">{new Date(audit.createdAt).toLocaleString()} · {audit.groupCount} domains · {audit.approvedCount} approved</span><span className="mt-1 block text-xs text-slate-500">{audit.sourceNames.join(", ") || "Legacy audit"}</span></button>)}</div>}</section>;
}

function Empty() { return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8"><h2 className="text-2xl font-semibold">What a completed audit contains</h2><ol className="mt-5 space-y-4 text-slate-700">{["Reconciled backlink evidence with source attribution", "Deduplicated referring-domain, anchor, target, and link-attribute groups", "Changes from the previous audit for the same domain", "Keep, review, removal, and disavow decisions with approval history", "HTML, CSV, XLSX, JSON, and Google-format draft disavow exports"].map((item, index) => <li key={item}><strong className="mr-2 text-[#a6781c]">{index + 1}.</strong>{item}</li>)}</ol><div className="mt-7 rounded bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Safety:</strong> imported vendor metrics remain context, not proof. The application never submits a disavow file and requires approval for every new entry.</div></div>; }

function Results({ report, comparison, update }: { report: AuditReport; comparison: AuditComparison | null; update: (group: DomainGroup, classification: Classification, approved: boolean) => void }) {
  const review = report.groups.filter((group) => group.classification !== "KEEP").length;
  return <div className="space-y-6"><div className="rounded-xl bg-[#10233f] p-6 text-white"><h2 className="text-2xl font-semibold">{report.target}</h2><p className="mt-2 text-sm text-white/65">Sources: {[...new Set(report.groups.flatMap((group) => group.sourceNames))].join(", ") || report.source.provider}</p><div className="mt-5 grid grid-cols-3 gap-3 text-center"><Metric value={report.source.rowsRetrieved} label="source rows"/><Metric value={report.groups.length} label="domains"/><Metric value={review} label="review"/></div><div className="mt-5 flex flex-wrap gap-2">{["html", "csv", "xlsx", "json", "txt"].map((format) => <a key={format} className="rounded bg-white/10 px-3 py-2 text-xs uppercase hover:bg-white/20" href={`/api/audits/${report.id}/export/${format}`}>{format}</a>)}</div></div>
    {report.imports.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Imported evidence</h3><div className="mt-3 space-y-2 text-sm">{report.imports.map((item) => <div key={item.fileName} className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-2"><span><strong>{item.fileName}</strong> · {item.source}</span><span className="text-slate-500">{item.rowsAccepted} accepted · {item.rowsRejected} skipped</span></div>)}</div></section>}
    {comparison && <Comparison value={comparison} />}
    {report.warnings.map((warning) => <p key={warning} className="rounded bg-amber-50 p-4 text-sm text-amber-950">{warning}</p>)}
    <div className="space-y-3">{report.groups.map((group) => <Group key={group.domain} group={group} update={update} />)}</div>
  </div>;
}

function Comparison({ value }: { value: AuditComparison }) {
  if (!value.previousAuditId) return <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Change since previous audit</h3><p className="mt-2 text-sm text-slate-600">First saved audit for this domain. The next audit will compare domains, evidence, decisions, approvals, and draft disavow entries against this baseline.</p></section>;
  return <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Change since {new Date(value.previousCreatedAt || "").toLocaleString()}</h3><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Delta value={value.newDomains.length} label="new domains"/><Delta value={value.removedDomains.length} label="missing domains"/><Delta value={value.changedGroups.length} label="changed decisions"/><Delta value={value.disavowAdded.length + value.disavowRemoved.length} label="draft changes"/></div>{(value.newDomains.length + value.removedDomains.length + value.changedGroups.length + value.disavowAdded.length + value.disavowRemoved.length) === 0 ? <p className="mt-4 text-sm text-slate-600">No material changes detected.</p> : <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium text-[#8a651c]">Review exact changes</summary><div className="mt-3 space-y-3 text-slate-700"><ChangeList label="New referring domains" values={value.newDomains}/><ChangeList label="No longer present" values={value.removedDomains}/><ChangeList label="Added draft entries" values={value.disavowAdded}/><ChangeList label="Removed draft entries" values={value.disavowRemoved}/>{value.changedGroups.map((change) => <p key={change.domain}><strong>{change.domain}</strong>: {change.previousClassification} → {change.currentClassification}; approval {String(change.previousApproved)} → {String(change.currentApproved)}{change.evidenceAdded.length ? `; evidence added: ${change.evidenceAdded.join(", ")}` : ""}{change.evidenceRemoved.length ? `; evidence removed: ${change.evidenceRemoved.join(", ")}` : ""}</p>)}</div></details>}</section>;
}
function ChangeList({ label, values }: { label: string; values: string[] }) { return values.length ? <div><strong>{label}</strong><ul className="mt-1 list-disc pl-5">{values.map((value) => <li key={value} className="break-all">{value}</li>)}</ul></div> : null; }
function Delta({ value, label }: { value: number; label: string }) { return <div className="rounded bg-slate-50 p-3 text-center"><strong className="block text-xl text-[#a6781c]">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>; }
function Metric({ value, label }: { value: number; label: string }) { return <div><div className="text-2xl font-semibold text-[#d6aa4b]">{value.toLocaleString()}</div><div className="text-xs uppercase tracking-wide text-white/60">{label}</div></div>; }

function Group({ group, update }: { group: DomainGroup; update: (group: DomainGroup, classification: Classification, approved: boolean) => void }) {
  return <details className="rounded-lg border border-slate-200 bg-white p-5" open={group.classification !== "KEEP"}><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><strong className="break-all">{group.domain}</strong><p className="mt-1 text-xs text-slate-500">{group.links.length} links · {group.followCount} follow · {Math.round(group.confidence * 100)}% confidence</p><p className="mt-1 text-xs text-[#8a651c]">{group.sourceNames.join(" · ")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{group.classification}</span></div></summary><div className="mt-5 border-t pt-4"><p className="text-sm">{group.note}</p><ul className="mt-3 space-y-2 text-sm">{group.evidence.map((item) => <li key={item.code}><strong>{item.label}:</strong> {item.detail}</li>)}</ul><div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><select aria-label={`Decision for ${group.domain}`} className="min-w-0 rounded border px-3 py-2 text-sm" value={group.classification} onChange={(event) => update(group, event.target.value as Classification, false)}>{["KEEP", "REVIEW", "REMOVE_URL", "DISAVOW_URL", "DISAVOW_DOMAIN"].map((option) => <option key={option}>{option}</option>)}</select><button className="rounded border px-4 py-2 text-sm disabled:opacity-40" disabled={!group.classification.startsWith("DISAVOW") && group.classification !== "REMOVE_URL"} onClick={() => update(group, group.classification, !group.approved)}>{group.approved ? "Revoke approval" : "Approve for draft"}</button></div>{group.decisionHistory.length > 0 && <details className="mt-4 text-xs text-slate-500"><summary className="cursor-pointer">Decision history ({group.decisionHistory.length})</summary><ul className="mt-2 space-y-1">{group.decisionHistory.map((event) => <li key={`${event.at}-${event.classification}-${event.approved}`}>{new Date(event.at).toLocaleString()} · {event.classification} · {event.approved ? "approved" : "not approved"}</li>)}</ul></details>}</div></details>;
}
