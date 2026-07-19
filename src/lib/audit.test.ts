import { describe, expect, it } from "vitest";
import { groupBacklinks, normalizeOptions } from "./audit";
import { normalizeVendorRow } from "./dataforseo";

function row(index: number, overrides: Record<string, unknown> = {}) { return normalizeVendorRow({ url_from: `https://spam-network.xyz/page-${index}`, url_to: "https://example.com/money", domain_from: "spam-network.xyz", domain_to: "example.com", anchor: "best agency services", dofollow: true, ...overrides }); }

describe("audit grouping", () => {
  it("normalizes and enforces configured limits", () => { const result = normalizeOptions({ target: "https://www.Example.com/path", maxBacklinks: 999999, inspectPages: -1 }); expect(result.target).toBe("example.com"); expect(result.maxBacklinks).toBe(25000); expect(result.inspectPages).toBe(0); });
  it("deduplicates rows and excludes self-domain links", () => { const external = row(1); const self = row(2, { domain_from: "blog.example.com", url_from: "https://blog.example.com/post" }); const groups = groupBacklinks([external, external, self], normalizeOptions({ target: "example.com" })); expect(groups).toHaveLength(1); expect(groups[0].links).toHaveLength(1); });
  it("flags a repeated commercial sitewide cluster for human review without auto-disavowing", () => { const groups = groupBacklinks(Array.from({ length: 60 }, (_, i) => row(i)), normalizeOptions({ target: "example.com" })); expect(groups[0].classification).toBe("REVIEW"); expect(groups[0].approved).toBe(false); expect(groups[0].evidence.map((x) => x.code)).toEqual(expect.arrayContaining(["REPEATED_ANCHOR", "COMMERCIAL_ANCHORS", "SITEWIDE_PATTERN"])); });
  it("keeps a small ordinary domain without unsupported evidence", () => { const groups = groupBacklinks([row(1, { domain_from: "publisher.com", url_from: "https://publisher.com/story", anchor: "Example research" })], normalizeOptions({ target: "example.com" })); expect(groups[0].classification).toBe("KEEP"); });
});
