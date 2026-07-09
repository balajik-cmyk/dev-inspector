import { describe, expect, it } from "vitest";
import { parseHideShortcut } from "../src/react/comments/parseHideShortcut";

describe("parseHideShortcut", () => {
  it("matches default Shift+C", () => {
    const match = parseHideShortcut("Shift+C");
    expect(match).toBeTruthy();
    expect(
      match!({
        key: "c",
        shiftKey: true,
        altKey: false,
        metaKey: false,
        ctrlKey: false,
      } as KeyboardEvent),
    ).toBe(true);
    expect(
      match!({
        key: "c",
        shiftKey: false,
        altKey: false,
        metaKey: false,
        ctrlKey: false,
      } as KeyboardEvent),
    ).toBe(false);
  });

  it("returns null when disabled", () => {
    expect(parseHideShortcut(false)).toBeNull();
  });
});
