import { describe, expect, it } from "vitest";
import { importBacklinkFiles, parseCsv } from "./imports";

const cases = [
  { name: "links-gsc.csv", header: "Source page,Target page,Last crawl", row: "https://source.test/a,https://example.com/a,2026-07-18", source: "Google Search Console" },
  { name: "links.csv", header: "Referring Page URL,Target URL,Anchor,Dofollow,Domain Rating", row: "https://source.test/a,https://example.com/a,example,yes,42", source: "Ahrefs" },
  { name: "semrush-export.csv", header: "Source URL,Target URL,Anchor,Page ASCore", row: "https://source.test/a,https://example.com/a,example,31", source: "Semrush" },
  { name: "links.csv", header: "SourceURL,TargetURL,AnchorText,SourceTrustFlow", row: "https://source.test/a,https://example.com/a,example,18", source: "Majestic" },
  { name: "moz-links.csv", header: "Source URL,Target URL,Anchor Text,Domain Authority", row: "https://source.test/a,https://example.com/a,example,27", source: "Moz" },
  { name: "custom.csv", header: "URL From,URL To,Anchor", row: "https://source.test/a,https://example.com/a,example", source: "Generic CSV" },
] as const;

describe("CSV backlink imports", () => {
  it.each(cases)("maps $source exports", ({ name, header, row, source }) => {
    const result = importBacklinkFiles([{ name, content: `${header}\n${row}\n` }]);
    expect(result.summaries[0]).toMatchObject({ source, rowsAccepted: 1, rowsRejected: 0 });
    expect(result.rows[0]).toMatchObject({ urlFrom: "https://source.test/a", urlTo: "https://example.com/a", sources: [source] });
  });

  it("handles quoted commas, escaped quotes, and rejected rows", () => {
    const result = importBacklinkFiles([{ name: "custom.csv", content: 'URL From,URL To,Anchor\nhttps://source.test/a,https://example.com/a,"A, ""quoted"" link"\nmissing,https://example.com/b,bad\n' }]);
    expect(result.rows[0].anchor).toBe('A, "quoted" link');
    expect(result.summaries[0]).toMatchObject({ rowsRead: 2, rowsAccepted: 1, rowsRejected: 1 });
    expect(result.warnings).toHaveLength(1);
  });

  it("excludes rows targeting another domain", () => {
    const result = importBacklinkFiles([{ name: "custom.csv", content: "URL From,URL To\nhttps://source.test/a,https://other.test/a\n" }], "example.com");
    expect(result.rows).toHaveLength(0);
    expect(result.summaries[0]).toMatchObject({ rowsAccepted: 0, rowsRejected: 1 });
  });

  it("rejects malformed quoted input", () => {
    expect(() => parseCsv('a,b\n"broken,b')).toThrow("unclosed quoted field");
  });
});
