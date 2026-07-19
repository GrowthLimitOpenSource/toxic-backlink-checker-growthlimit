import type { DomainGroup } from "./types";

export async function reviewWithLlm(groups: DomainGroup[]): Promise<DomainGroup[]> {
  const key = process.env.LLM_API_KEY;
  const endpoint = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || "gpt-5-mini";
  if (!key) throw new Error("LLM_API_KEY is required when LLM review is enabled.");
  const candidates = groups.filter((group) => group.classification === "REVIEW").slice(0, Number(process.env.MAX_LLM_GROUPS || 200));
  for (const group of candidates) {
    const payload = { domain: group.domain, linkCount: group.links.length, anchors: group.anchors.slice(0, 10), targets: group.targets.slice(0, 10), deterministicEvidence: group.evidence, inspection: group.inspection || null };
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "system", content: "You review backlink evidence. Vendor scores alone never prove manipulation. Return JSON with note (string), humanChecks (string[]), confidence (0..1). Do not recommend disavow or claim Google counts a link." }, { role: "user", content: JSON.stringify(payload) }] }) });
    if (!response.ok) { group.note += ` LLM review failed with HTTP ${response.status}.`; continue; }
    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    try {
      const result = JSON.parse(json.choices?.[0]?.message?.content || "{}") as { note?: unknown; humanChecks?: unknown; confidence?: unknown };
      if (typeof result.note === "string") group.note = result.note.slice(0, 1000);
      if (Array.isArray(result.humanChecks)) group.humanChecks = result.humanChecks.filter((x): x is string => typeof x === "string").slice(0, 8);
      if (typeof result.confidence === "number") group.confidence = Math.max(0, Math.min(1, result.confidence));
    } catch { group.note += " LLM returned invalid JSON; deterministic classification retained."; }
  }
  return groups;
}
