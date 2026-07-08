import { describe, expect, it } from "vitest";
import { computeMeasureBands } from "../src/core/measure";
import type { HighlightRect } from "../src/core/types";

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): HighlightRect {
  return { left, top, width, height, label: "test" };
}

describe("computeMeasureBands", () => {
  it("returns horizontal gap between disjoint boxes", () => {
    const s = rect(0, 0, 100, 40);
    const t = rect(140, 0, 80, 40);
    const bands = computeMeasureBands(s, t);
    expect(bands).toHaveLength(1);
    expect(bands[0]?.distance).toBe(40);
    expect(bands[0]?.left).toBe(100);
    expect(bands[0]?.width).toBe(40);
  });

  it("returns vertical gap between disjoint boxes", () => {
    const s = rect(0, 0, 100, 40);
    const t = rect(0, 60, 100, 40);
    const bands = computeMeasureBands(s, t);
    expect(bands).toHaveLength(1);
    expect(bands[0]?.distance).toBe(20);
    expect(bands[0]?.top).toBe(40);
    expect(bands[0]?.height).toBe(20);
  });

  it("returns inset bands when one box contains the other", () => {
    const outer = rect(0, 0, 200, 200);
    const inner = rect(40, 40, 80, 80);
    const bands = computeMeasureBands(inner, outer);
    expect(bands.length).toBeGreaterThanOrEqual(3);
    expect(bands.every((b) => b.distance >= 0.5)).toBe(true);
  });

  it("filters sub-pixel distances", () => {
    const s = rect(0, 0, 100, 40);
    const t = rect(100.2, 0, 80, 40);
    const bands = computeMeasureBands(s, t);
    expect(bands).toHaveLength(0);
  });
});
