import { INSPECTOR_ATTR } from "./types";
import type { HighlightRect } from "./types";

export function isInsideInspector(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest(`[${INSPECTOR_ATTR}]`))
  );
}

export function pickInspectableElement(x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (el.closest(`[${INSPECTOR_ATTR}]`)) continue;
    if (el === document.documentElement || el === document.body) continue;
    return el;
  }
  return null;
}

/** Pick target for comment pins — includes `body` when nothing else matches. */
export function pickCommentTarget(x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (el.closest(`[${INSPECTOR_ATTR}]`)) continue;
    if (el === document.documentElement) continue;
    return el;
  }
  return document.body;
}

export function rectFromElement(el: Element): HighlightRect {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    label: `${el.tagName.toLowerCase()} · ${Math.round(rect.width)}×${Math.round(rect.height)}`,
  };
}

export function boundingBoxFromElement(el: Element) {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

export const isMac =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

/** Alt/Option (or Meta/Cmd) held: capture for inspection instead of interacting. */
export function isCaptureGesture(event: MouseEvent | PointerEvent): boolean {
  return event.altKey || event.metaKey;
}
