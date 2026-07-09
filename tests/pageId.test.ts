import { describe, expect, it } from "vitest";
import { computePageId, hashString, normalizePageUrl } from "../src/core/pageId";

describe("normalizePageUrl", () => {
  it("strips query and hash", () => {
    expect(normalizePageUrl("https://app.example.com/dashboard?tab=1#x")).toBe(
      "https://app.example.com/dashboard",
    );
  });

  it("strips trailing slash", () => {
    expect(normalizePageUrl("https://app.example.com/dashboard/")).toBe(
      "https://app.example.com/dashboard",
    );
  });

  it("normalizes root path to /", () => {
    expect(normalizePageUrl("https://app.example.com")).toBe(
      "https://app.example.com/",
    );
  });
});

describe("hashString", () => {
  it("is deterministic", () => {
    expect(hashString("hello")).toBe(hashString("hello"));
  });

  it("differs for different input", () => {
    expect(hashString("hello")).not.toBe(hashString("world"));
  });

  it("returns a non-empty base36 string", () => {
    expect(hashString("hello")).toMatch(/^[0-9a-z]+$/);
  });
});

describe("computePageId", () => {
  it("is stable for equivalent URLs", () => {
    const a = computePageId("https://app.example.com/dashboard?tab=1");
    const b = computePageId("https://app.example.com/dashboard?tab=2#section");
    expect(a).toBe(b);
  });

  it("differs for different pages", () => {
    const a = computePageId("https://app.example.com/dashboard");
    const b = computePageId("https://app.example.com/settings");
    expect(a).not.toBe(b);
  });
});
