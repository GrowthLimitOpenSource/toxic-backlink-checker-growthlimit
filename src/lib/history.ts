import { getAudit, listAudits } from "./store";
import type { AuditComparison, AuditReport, DomainGroup } from "./types";

export async function compareAudit(current: AuditReport, requestedPreviousId?: string): Promise<AuditComparison> {
  const previous = requestedPreviousId
    ? await getAudit(requestedPreviousId)
    : await findPrevious(current);
  return compareReports(current, previous);
}

export function compareReports(current: AuditReport, previous: AuditReport | null): AuditComparison {
  if (previous && previous.target !== current.target) throw new Error("Audits can only be compared when their target domains match.");

  const currentGroups = new Map(current.groups.map((group) => [group.domain, group]));
  const previousGroups = new Map((previous?.groups || []).map((group) => [group.domain, group]));
  const newDomains = [...currentGroups.keys()].filter((domain) => !previousGroups.has(domain)).sort();
  const removedDomains = [...previousGroups.keys()].filter((domain) => !currentGroups.has(domain)).sort();
  const changedGroups = [...currentGroups.entries()].flatMap(([domain, group]) => {
    const before = previousGroups.get(domain);
    if (!before || !changed(before, group)) return [];
    const beforeEvidence = new Set(before.evidence.map((item) => item.code));
    const currentEvidence = new Set(group.evidence.map((item) => item.code));
    return [{
      domain,
      previousClassification: before.classification,
      currentClassification: group.classification,
      previousApproved: before.approved,
      currentApproved: group.approved,
      evidenceAdded: [...currentEvidence].filter((code) => !beforeEvidence.has(code)).sort(),
      evidenceRemoved: [...beforeEvidence].filter((code) => !currentEvidence.has(code)).sort(),
    }];
  }).sort((a, b) => a.domain.localeCompare(b.domain));

  const currentDisavow = disavowEntries(current.proposedDisavow);
  const previousDisavow = disavowEntries(previous?.proposedDisavow || "");
  return {
    currentAuditId: current.id,
    previousAuditId: previous?.id || null,
    previousCreatedAt: previous?.createdAt || null,
    newDomains,
    removedDomains,
    changedGroups,
    disavowAdded: [...currentDisavow].filter((entry) => !previousDisavow.has(entry)).sort(),
    disavowRemoved: [...previousDisavow].filter((entry) => !currentDisavow.has(entry)).sort(),
  };
}

async function findPrevious(current: AuditReport): Promise<AuditReport | null> {
  const match = (await listAudits()).find((audit) => audit.target === current.target && audit.id !== current.id && audit.createdAt < current.createdAt);
  return match ? getAudit(match.id) : null;
}

function changed(before: DomainGroup, current: DomainGroup): boolean {
  if (before.classification !== current.classification || before.approved !== current.approved) return true;
  return evidenceKey(before) !== evidenceKey(current);
}
function evidenceKey(group: DomainGroup): string { return group.evidence.map((item) => item.code).sort().join("\n"); }
function disavowEntries(value: string): Set<string> { return new Set(value.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"))); }
