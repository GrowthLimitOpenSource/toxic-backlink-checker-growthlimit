import { describe, expect, it } from "vitest";
import { compareReports } from "./history";
import type { AuditReport, Classification, DomainGroup } from "./types";

function group(domain: string, classification: Classification, approved: boolean, evidence: string[]): DomainGroup {
  return { domain, classification, approved, evidence: evidence.map((code) => ({ code, label: code, detail: code, weight: 1, kind: "risk" })), links: [], anchors: [], targets: [], followCount: 0, sitewideTargets: 0, sourceNames: ["DataForSEO"], confidence: 0.5, humanChecks: [], note: "", decisionHistory: [] };
}
function report(id: string, groups: DomainGroup[], proposedDisavow = "", target = "example.com"): AuditReport {
  return { id, applicationVersion: "1.1.0", ruleSetVersion: "test", createdAt: id === "current" ? "2026-07-19T12:00:00Z" : "2026-07-18T12:00:00Z", target, options: { target, includeSubdomains: true, includeDataForSeo: true, maxBacklinks: 10, inspectPages: 0, concurrency: 1, fetchTimeoutMs: 1000, maxResponseBytes: 50000, commercialTerms: [], useLlm: false }, source: { provider: "DataForSEO", endpoint: "test", rowsRetrieved: 0, cost: 0, tasks: 0 }, summary: null, groups, imports: [], existingDisavow: { comments: [], domains: [], urls: [], invalid: [] }, proposedDisavow, warnings: [], llm: { enabled: false, provider: null, model: null, groupsReviewed: 0 } };
}

describe("audit history comparison", () => {
  it("reports new, missing, changed, and disavow entries", () => {
    const previous = report("previous", [group("changed.test", "REVIEW", false, ["OLD"]), group("gone.test", "KEEP", false, [])], "domain:old.test");
    const current = report("current", [group("changed.test", "DISAVOW_DOMAIN", true, ["NEW"]), group("new.test", "KEEP", false, [])], "domain:new.test");
    expect(compareReports(current, previous)).toEqual(expect.objectContaining({
      newDomains: ["new.test"],
      removedDomains: ["gone.test"],
      disavowAdded: ["domain:new.test"],
      disavowRemoved: ["domain:old.test"],
      changedGroups: [expect.objectContaining({ domain: "changed.test", previousClassification: "REVIEW", currentClassification: "DISAVOW_DOMAIN", previousApproved: false, currentApproved: true, evidenceAdded: ["NEW"], evidenceRemoved: ["OLD"] })],
    }));
  });

  it("returns an explicit empty baseline for a first audit", () => {
    expect(compareReports(report("current", [group("new.test", "KEEP", false, [])]), null)).toMatchObject({ previousAuditId: null, newDomains: ["new.test"], removedDomains: [], changedGroups: [] });
  });

  it("rejects comparisons across target domains", () => {
    expect(() => compareReports(report("current", []), report("previous", [], "", "other.test"))).toThrow("target domains match");
  });
});
