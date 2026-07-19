import { describe, expect, it } from "vitest";
import { parseDisavow, renderDisavow } from "./disavow";
import type { DomainGroup } from "./types";

describe("disavow handling", () => {
  it("preserves comments, normalizes and deduplicates accepted entries", () => { const parsed = parseDisavow("# existing\ndomain:Spam.Example\ndomain:spam.example\nhttps://bad.example/page", "site.com"); expect(parsed.comments).toEqual(["# existing"]); expect(parsed.domains).toEqual(["domain:spam.example"]); expect(parsed.urls).toEqual(["https://bad.example/page"]); });
  it("rejects malformed, private, credential-bearing, and self-domain entries", () => { const parsed = parseDisavow("domain:not valid\ndomain:site.com\nhttp://127.0.0.1/x\nhttps://user:pass@bad.example/", "site.com"); expect(parsed.invalid).toHaveLength(4); });
  it("includes only individually approved disavow decisions", () => { const base = { links: [{ urlFrom: "https://bad.example/page" }] } as DomainGroup; const groups = [{ ...base, domain: "bad.example", classification: "DISAVOW_DOMAIN", approved: true }, { ...base, domain: "review.example", classification: "DISAVOW_DOMAIN", approved: false }] as DomainGroup[]; const text = renderDisavow(groups, parseDisavow("# old\ndomain:old.example", "site.com")); expect(text).toContain("domain:old.example"); expect(text).toContain("domain:bad.example"); expect(text).not.toContain("domain:review.example"); });
});
