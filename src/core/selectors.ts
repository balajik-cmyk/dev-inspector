export { formatSelectorHint } from "./inspectorCss";

function segmentForElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const type =
    el instanceof HTMLInputElement && el.type ? `[type="${el.type}"]` : "";
  const dataSlot = el.getAttribute("data-slot");
  const slot = dataSlot ? `[data-slot="${dataSlot}"]` : "";
  const classList = el.classList;
  const firstClass = classList.length > 0 ? `.${classList[0]}` : "";
  return `${tag}${id}${type}${slot}${firstClass}`;
}

/** DOM path from body to element, e.g. body > main > button.primary */
export function buildElementPath(el: Element, maxDepth = 12): string {
  const segments: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.documentElement) {
    segments.unshift(segmentForElement(current));
    if (current === document.body) break;
    current = current.parentElement;
    if (segments.length >= maxDepth) break;
  }

  if (segments[0] !== "body" && document.body.contains(el)) {
    segments.unshift("body");
  }

  return segments.join(" > ");
}
