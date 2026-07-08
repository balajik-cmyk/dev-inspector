import { describe, expect, it } from "vitest";
import {
  formatElementLabel,
  formatSelectorHint,
  specToCss,
} from "../src/core/inspectorCss";

describe("inspectorCss", () => {
  it("formats selector hint with data-slot", () => {
    const el = {
      tagName: "HEADER",
      id: "",
      classList: ["foo"],
      getAttribute: (name: string) =>
        name === "data-slot" ? "sheet-header" : null,
    } as unknown as Element;

    expect(formatSelectorHint(el)).toBe('header[data-slot="sheet-header"].foo');
  });

  it("formats element label with size", () => {
    const el = {
      tagName: "DIV",
      id: "",
      classList: ["panel"],
    } as unknown as Element;
    const rect = { width: 480.4, height: 56.2 } as DOMRect;

    expect(formatElementLabel(el, rect)).toBe("div.panel · 480×56");
  });

  it("serializes spec to copyable css", () => {
    const css = specToCss({
      label: "div.panel",
      selectorHint: "div.panel",
      sections: [
        {
          title: "Border",
          properties: [{ name: "border-radius", value: "16px" }],
        },
        {
          title: "Effects",
          properties: [
            {
              name: "box-shadow",
              value:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
            },
          ],
        },
      ],
    });

    expect(css).toContain("border-radius: 16px;");
    expect(css).toContain("box-shadow:");
    expect(css).toContain("/* Border */");
  });
});
