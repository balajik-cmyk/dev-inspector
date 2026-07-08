import { describe, expect, it } from "vitest";
import { formatAnnotationsMarkdown } from "../src/format/markdown";
import type { Annotation } from "../src/core/types";

const sample: Annotation = {
  id: "1",
  comment: "Padding should be 16px not 24px",
  timestamp: 1,
  element: "button · Submit",
  elementPath: "body > main > form > button[type=\"submit\"]",
  selectorHint: "button.primary",
  boundingBox: { x: 120, y: 340, width: 842, height: 48 },
  cssSnippet: "padding: 24px;",
};

describe("formatAnnotationsMarkdown", () => {
  it("returns empty string for no annotations", () => {
    expect(formatAnnotationsMarkdown([])).toBe("");
  });

  it("formats a single annotation with css snippet", () => {
    const md = formatAnnotationsMarkdown([sample]);
    expect(md).toContain("## Annotation 1 — button · Submit");
    expect(md).toContain("**Element:** button · Submit");
    expect(md).toContain(
      "**Path:** `body > main > form > button[type=\"submit\"]`",
    );
    expect(md).toContain("**Position:** 842×48 at (120, 340)");
    expect(md).toContain("**Note:** Padding should be 16px not 24px");
    expect(md).toContain("```css");
    expect(md).toContain("padding: 24px;");
  });

  it("numbers multiple annotations", () => {
    const md = formatAnnotationsMarkdown([
      sample,
      { ...sample, id: "2", comment: "Second note" },
    ]);
    expect(md).toContain("## Annotation 1 —");
    expect(md).toContain("## Annotation 2 —");
    expect(md).toContain("Second note");
  });
});
