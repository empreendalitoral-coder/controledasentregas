import { describe, expect, it } from "vitest";
import { feedExpiryCutoff, FEED_LIFETIME_MS } from "./feed-expiry";

describe("Feed expiration", () => {
  it("expires after exactly 24 hours", () => {
    expect(FEED_LIFETIME_MS).toBe(86_400_000);
    expect(feedExpiryCutoff(Date.parse("2026-11-15T03:00:00Z"))).toBe("2026-11-14T03:00:00.000Z");
  });
});