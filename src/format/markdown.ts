import type { Annotation } from "../core/types";

function formatAnnotationBlock(annotation: Annotation, index: number): string {
  const { boundingBox: box } = annotation;
  const lines = [
    `## Annotation ${index + 1} — ${annotation.element}`,
    `**Element:** ${annotation.element}`,
    `**Path:** \`${annotation.elementPath}\``,
    `**Position:** ${box.width}×${box.height} at (${box.x}, ${box.y})`,
    `**Note:** ${annotation.comment}`,
  ];

  if (annotation.cssSnippet) {
    lines.push("", "```css", annotation.cssSnippet, "```");
  }

  return lines.join("\n");
}

export function formatAnnotationsMarkdown(annotations: Annotation[]): string {
  if (annotations.length === 0) return "";
  return annotations
    .map((annotation, index) => formatAnnotationBlock(annotation, index))
    .join("\n\n");
}

export function formatSingleAnnotationMarkdown(annotation: Annotation): string {
  return formatAnnotationBlock(annotation, 0).replace(/^## Annotation 1 — /, "## ");
}
