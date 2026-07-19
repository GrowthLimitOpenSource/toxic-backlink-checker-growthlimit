import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildAuditXlsx } from "./exports";
import type { AuditReport, BacklinkRow } from "./types";

const report = {
  id: "audit-1",
  applicationVersion: "1.1.0",
  ruleSetVersion: "2026-07-19",
  createdAt: "2026-07-19T00:00:00.000Z",
  target: "example.com",
  options: {
    target: "example.com",
    includeSubdomains: true,
    includeDataForSeo: true,
    maxBacklinks: 1_000,
    inspectPages: 20,
    concurrency: 3,
    fetchTimeoutMs: 10_000,
    maxResponseBytes: 1_000_000,
    commercialTerms: [],
    useLlm: false,
  },
  source: { provider: "DataForSEO", endpoint: "backlinks", rowsRetrieved: 1, cost: 0.01, tasks: 1 },
  summary: null,
  imports: [],
  groups: [{
    domain: "publisher.example",
    links: [{} as BacklinkRow],
    anchors: [{ value: "Research & <analysis>", count: 1, share: 1 }],
    targets: [],
    followCount: 1,
    sitewideTargets: 0,
    sourceNames: ["DataForSEO", "Google Search Console"],
    evidence: [{ code: "CONTEXT", label: "Context", detail: "Relevant > generic", weight: 0, kind: "context" }],
    classification: "KEEP",
    confidence: 0.75,
    humanChecks: [],
    note: "Retain",
    approved: false,
    decisionHistory: [{ at: "2026-07-19T00:00:00.000Z", classification: "KEEP", approved: false }],
  }],
  existingDisavow: { comments: [], domains: [], urls: [], invalid: [] },
  proposedDisavow: "",
  warnings: [],
  llm: { enabled: false, provider: null, model: null, groupsReviewed: 0 },
} satisfies AuditReport;

describe("XLSX export", () => {
  it("creates an Excel-readable workbook with typed audit rows and escaped text", () => {
    const workbook = buildAuditXlsx(report);
    expect([...workbook.slice(0, 2)]).toEqual([0x50, 0x4b]);

    const files = unzipSync(workbook);
    expect(Object.keys(files)).toEqual(expect.arrayContaining([
      "[Content_Types].xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]));

    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain("publisher.example");
    expect(sheet).toContain("Research &amp; &lt;analysis&gt;");
    expect(sheet).toContain("DataForSEO | Google Search Console");
    expect(sheet).toContain("decision_history");
    expect(sheet).toContain('<c r="D2"><v>0.75</v></c>');
    expect(sheet).toContain('<c r="C2" t="b"><v>0</v></c>');
  });
});
