import { rectFromElement } from "../../core/dom";
import type { HighlightRect } from "../../core/types";
import type { CommentPinData } from "./types";

/**
 * Best-effort re-resolve of a pinned DOM element from stored path / selector.
 * Returns null when the element is gone (orphaned pin — hide marker).
 */
export function resolvePinnedElement(pin: CommentPinData): Element | null {
  const byHint = queryByHint(pin.selectorHint);
  if (byHint.length === 1) return byHint[0]!;
  if (byHint.length > 1) {
    return pickClosestToBox(byHint, pin.boundingBox);
  }

  const byPath = walkElementPath(pin.elementPath);
  if (byPath) return byPath;

  return null;
}

export function pinRectForComment(pin: CommentPinData): HighlightRect | null {
  const el = resolvePinnedElement(pin);
  return el ? rectFromElement(el) : null;
}

function queryByHint(hint: string): Element[] {
  if (!hint) return [];
  try {
    return Array.from(document.querySelectorAll(hint));
  } catch {
    return [];
  }
}

function pickClosestToBox(
  elements: Element[],
  box: CommentPinData["boundingBox"],
): Element | null {
  let best: Element | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const el of elements) {
    const r = el.getBoundingClientRect();
    const dx = r.left + window.scrollX - box.x;
    const dy = r.top + window.scrollY - box.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }
  return best;
}

/** Walk a stored path like `body > main > button.primary`. */
function walkElementPath(path: string): Element | null {
  const segments = path
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!segments.length) return null;

  let current: Element | null =
    segments[0] === "body" ? document.body : document.documentElement;

  for (let i = segments[0] === "body" ? 1 : 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (!current) return null;
    const next = findChildMatching(current, seg);
    if (!next) return null;
    current = next;
  }

  return current;
}

function findChildMatching(parent: Element, segment: string): Element | null {
  const children = Array.from(parent.children);
  for (const child of children) {
    if (matchesSegment(child, segment)) return child;
  }
  // Soft fallback: query within parent
  try {
    const found = parent.querySelector(`:scope > ${segment}`);
    if (found) return found;
  } catch {
    /* invalid selector */
  }
  return null;
}

function matchesSegment(el: Element, segment: string): boolean {
  const tagMatch = segment.match(/^([a-z0-9-]+)/i);
  if (!tagMatch) return false;
  if (el.tagName.toLowerCase() !== tagMatch[1]!.toLowerCase()) return false;

  const idMatch = segment.match(/#([^.\[\s]+)/);
  if (idMatch && el.id !== idMatch[1]) return false;

  const classMatch = segment.match(/\.([^\.\[#\s]+)/);
  if (classMatch && !el.classList.contains(classMatch[1]!)) return false;

  const typeMatch = segment.match(/\[type="([^"]+)"\]/);
  if (
    typeMatch &&
    (!(el instanceof HTMLInputElement) || el.type !== typeMatch[1])
  ) {
    return false;
  }

  const slotMatch = segment.match(/\[data-slot="([^"]+)"\]/);
  if (slotMatch && el.getAttribute("data-slot") !== slotMatch[1]) return false;

  return true;
}
