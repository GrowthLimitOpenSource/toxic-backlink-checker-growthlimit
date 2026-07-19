import { describe, expect, it } from "vitest";
import { inspectBacklink } from "./inspect";
import { normalizeVendorRow } from "./dataforseo";

describe("representative page inspection", () => {
  it("blocks loopback destinations before making a request", async () => { const link = normalizeVendorRow({ url_from: "http://127.0.0.1:3000/private", url_to: "https://example.com", anchor: "example" }); const result = await inspectBacklink(link, 1000, 100000); expect(result.status).toBeNull(); expect(result.blockedReason).toMatch(/private|unsafe|blocked/i); });
  it("blocks credential-bearing URLs", async () => { const link = normalizeVendorRow({ url_from: "https://user:pass@example.org/page", url_to: "https://example.com", anchor: "example" }); const result = await inspectBacklink(link, 1000, 100000); expect(result.blockedReason).toMatch(/credential/i); });
});
