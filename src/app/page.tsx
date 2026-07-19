"use client";
import { FormEvent, useState } from "react";
import type { AuditReport, Classification, DomainGroup } from "@/lib/types";

export default function Home() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = { target: form.get("target"), maxBacklinks: Number(form.get("maxBacklinks")), inspectPages: Number(form.get("inspectPages")), includeSubdomains: form.get("includeSubdomains") === "on", useLlm: form.get("useLlm") === "on", existingDisavow: form.get("existingDisavow") };
    const response = await fetch("/api/audits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Audit failed."); else setReport(json.report);
    setLoading(false);
  }
  async function update(group: DomainGroup, classification: Classification, approved: boolean) {
    if (!report) return;
    const response = await fetch(`/api/audits/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: group.domain, classification, approved }) });
    if (response.ok) setReport(await response.json()); else setError("The decision could not be saved.");
  }
  return <main>
    <header className="border-b border-white/10 bg-[#10233f] text-white"><div className="mx-auto max-w-6xl px-6 py-16"><p className="mb-4 text-sm font-semibold uppercase tracking-[.22em] text-[#d6aa4b]">Open-source, local-first audit</p><h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">Toxic Backlink Checker by GrowthLimit.com</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-white/75">Retrieve backlinks with your own DataForSEO account, group patterns, inspect representative pages, document evidence, and export a human-reviewed draft. Nothing is uploaded to Growth Limit.</p><div className="mt-7 flex flex-wrap gap-4 text-sm"><a className="rounded bg-[#d6aa4b] px-5 py-3 font-semibold text-[#10233f]" href="https://www.growthlimit.com/blog/identifying-toxic-backlinks">Read the evidence methodology</a><a className="rounded border border-white/30 px-5 py-3" href="https://www.growthlimit.com/tools/toxic-backlink-checker">Setup guide</a></div></div></header>
    <section className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[420px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-5 rounded-xl border border-[#d7d0c4] bg-white p-6 shadow-sm">
        <div><h2 className="text-2xl font-semibold">Start an audit</h2><p className="mt-2 text-sm text-slate-600">Credentials stay in your local <code>.env.local</code>. Estimate: $0.06 per 1,000 backlink rows at the documented July 2026 DataForSEO rate; verify current pricing.</p></div>
        <Field label="Domain"><input required name="target" placeholder="example.com" /></Field>
        <div className="grid grid-cols-2 gap-4"><Field label="Maximum rows"><input name="maxBacklinks" type="number" min="1" max="25000" defaultValue="25000" /></Field><Field label="Pages to inspect"><input name="inspectPages" type="number" min="0" max="500" defaultValue="100" /></Field></div>
        <label className="flex gap-3 text-sm"><input name="includeSubdomains" type="checkbox" defaultChecked /> Include subdomains</label><label className="flex gap-3 text-sm"><input name="useLlm" type="checkbox" /> Optional LLM evidence summaries</label>
        <Field label="Existing disavow file (recommended)"><textarea name="existingDisavow" rows={6} placeholder="# Paste the complete current file here&#10;domain:spam-example.com" /></Field>
        <button disabled={loading} className="w-full rounded bg-[#10233f] px-5 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Retrieving and analyzing…" : "Run backlink audit"}</button>
        {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      </form>
      <div>{report ? <Results report={report} update={update} /> : <Empty />}</div>
    </section>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}<div className="mt-2 [&_input]:w-full [&_input]:rounded [&_input]:border [&_input]:border-slate-300 [&_input]:px-3 [&_input]:py-2 [&_textarea]:w-full [&_textarea]:rounded [&_textarea]:border [&_textarea]:border-slate-300 [&_textarea]:px-3 [&_textarea]:py-2">{children}</div></label>; }
function Empty() { return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8"><h2 className="text-2xl font-semibold">What a completed audit contains</h2><ol className="mt-5 space-y-4 text-slate-700">{["DataForSEO backlink summary and paginated raw rows", "Deduplicated referring-domain, anchor, target, and link-attribute groups", "Deterministic evidence signals and representative-page inspections", "Keep, review, removal, and disavow decisions requiring explicit approval", "HTML, CSV, XLSX, JSON, and Google-format draft disavow exports"].map((x,i)=><li key={x}><strong className="mr-2 text-[#a6781c]">{i+1}.</strong>{x}</li>)}</ol><div className="mt-7 rounded bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Safety:</strong> a low authority score, unfamiliar TLD, or vendor “toxicity” score does not prove a link violates Google policy. The checker will not upload a disavow file.</div></div>; }
function Results({ report, update }: { report: AuditReport; update: (g: DomainGroup, c: Classification, a: boolean) => void }) { const review = report.groups.filter(g=>g.classification!=="KEEP").length; return <div className="space-y-6"><div className="rounded-xl bg-[#10233f] p-6 text-white"><h2 className="text-2xl font-semibold">{report.target}</h2><div className="mt-5 grid grid-cols-3 gap-3 text-center"><Metric value={report.source.rowsRetrieved} label="rows"/><Metric value={report.groups.length} label="domains"/><Metric value={review} label="review"/></div><div className="mt-5 flex flex-wrap gap-2">{["html","csv","xlsx","json","txt"].map(f=><a key={f} className="rounded bg-white/10 px-3 py-2 text-xs uppercase" href={`/api/audits/${report.id}/export/${f}`}>Download {f}</a>)}</div></div>{report.warnings.map(w=><p key={w} className="rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm">{w}</p>)}<div className="space-y-4">{report.groups.slice(0,200).map(group=><Group key={group.domain} group={group} update={update}/>)}</div></div>; }
function Metric({value,label}:{value:number,label:string}){return <div><div className="text-2xl font-semibold text-[#d6aa4b]">{value.toLocaleString()}</div><div className="text-xs uppercase tracking-wide text-white/60">{label}</div></div>}
function Group({group,update}:{group:DomainGroup;update:(g:DomainGroup,c:Classification,a:boolean)=>void}) { return <details className="rounded-lg border border-slate-200 bg-white p-5" open={group.classification!=="KEEP"}><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{group.domain}</strong><p className="mt-1 text-xs text-slate-500">{group.links.length} links · {group.followCount} follow · {Math.round(group.confidence*100)}% confidence</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{group.classification}</span></div></summary><div className="mt-5 border-t pt-4"><p className="text-sm">{group.note}</p><ul className="mt-3 space-y-2 text-sm">{group.evidence.map(e=><li key={e.code}><strong>{e.label}:</strong> {e.detail}</li>)}</ul>{group.inspection&&<p className="mt-3 text-sm"><strong>Inspection:</strong> {group.inspection.blockedReason || `${group.inspection.status}; link ${group.inspection.linkFound?"found":"not found"}`}</p>}<div className="mt-4 flex flex-wrap gap-2"><select aria-label={`Decision for ${group.domain}`} value={group.classification} onChange={e=>update(group,e.target.value as Classification,false)} className="rounded border px-3 py-2 text-sm">{["KEEP","REVIEW","REMOVE_URL","DISAVOW_URL","DISAVOW_DOMAIN"].map(x=><option key={x}>{x}</option>)}</select><button disabled={!group.classification.startsWith("DISAVOW")} onClick={()=>update(group,group.classification,!group.approved)} className="rounded border px-3 py-2 text-sm disabled:opacity-40">{group.approved?"Revoke approval":"Approve for draft"}</button></div></div></details>; }
