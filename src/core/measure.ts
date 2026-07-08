import { INSPECTOR_ATTR } from "./types";
import type { HighlightRect, MeasureBand } from "./types";

/**
 * Figma-style spacing bands between the selected box (S) and a hovered box (T).
 */
export function computeMeasureBands(
  s: HighlightRect,
  t: HighlightRect,
): MeasureBand[] {
  const sL = s.left;
  const sR = s.left + s.width;
  const sT = s.top;
  const sB = s.top + s.height;
  const tL = t.left;
  const tR = t.left + t.width;
  const tT = t.top;
  const tB = t.top + t.height;

  const sInsideT = sL >= tL && sR <= tR && sT >= tT && sB <= tB;
  const tInsideS = tL >= sL && tR <= sR && tT >= sT && tB <= sB;

  if (sInsideT || tInsideS) {
    const inner = sInsideT ? s : t;
    const outer = sInsideT ? t : s;
    const iL = inner.left;
    const iR = inner.left + inner.width;
    const iT = inner.top;
    const iB = inner.top + inner.height;
    const oL = outer.left;
    const oR = outer.left + outer.width;
    const oT = outer.top;
    const oB = outer.top + outer.height;
    return [
      {
        left: oL,
        top: iT,
        width: iL - oL,
        height: inner.height,
        distance: iL - oL,
      },
      {
        left: iR,
        top: iT,
        width: oR - iR,
        height: inner.height,
        distance: oR - iR,
      },
      {
        left: iL,
        top: oT,
        width: inner.width,
        height: iT - oT,
        distance: iT - oT,
      },
      {
        left: iL,
        top: iB,
        width: inner.width,
        height: oB - iB,
        distance: oB - iB,
      },
    ].filter((b) => b.distance >= 0.5);
  }

  const bands: MeasureBand[] = [];

  const yA = Math.max(sT, tT);
  const yB = Math.min(sB, tB);
  const hasVOverlap = yB > yA;
  const bandTop = hasVOverlap ? yA : sT;
  const bandH = hasVOverlap ? yB - yA : s.height;
  if (sR <= tL) {
    bands.push({
      left: sR,
      top: bandTop,
      width: tL - sR,
      height: bandH,
      distance: tL - sR,
    });
  } else if (tR <= sL) {
    bands.push({
      left: tR,
      top: bandTop,
      width: sL - tR,
      height: bandH,
      distance: sL - tR,
    });
  }

  const xA = Math.max(sL, tL);
  const xB = Math.min(sR, tR);
  const hasHOverlap = xB > xA;
  const bandLeft = hasHOverlap ? xA : sL;
  const bandW = hasHOverlap ? xB - xA : s.width;
  if (sB <= tT) {
    bands.push({
      left: bandLeft,
      top: sB,
      width: bandW,
      height: tT - sB,
      distance: tT - sB,
    });
  } else if (tB <= sT) {
    bands.push({
      left: bandLeft,
      top: tB,
      width: bandW,
      height: sT - tB,
      distance: sT - tB,
    });
  }

  return bands.filter((b) => b.distance >= 0.5);
}

/**
 * Figma-style "space around": gap to nearest sibling on each side.
 */
export function findNeighborBands(el: Element): MeasureBand[] {
  const parent = el.parentElement;
  if (!parent) return [];
  const R = el.getBoundingClientRect();
  if (R.width === 0 || R.height === 0) return [];
  const eps = 0.5;

  let right: MeasureBand | null = null;
  let left: MeasureBand | null = null;
  let top: MeasureBand | null = null;
  let bottom: MeasureBand | null = null;

  for (const sib of Array.from(parent.children)) {
    if (sib === el) continue;
    if (sib.closest(`[${INSPECTOR_ATTR}]`)) continue;
    const c = sib.getBoundingClientRect();
    if (c.width === 0 || c.height === 0) continue;

    const vTop = Math.max(R.top, c.top);
    const vBot = Math.min(R.bottom, c.bottom);
    const vOverlap = vBot - vTop;
    if (vOverlap > 0) {
      if (c.left >= R.right - eps) {
        const gap = c.left - R.right;
        if (gap >= eps && (!right || gap < right.distance)) {
          right = {
            left: R.right,
            top: vTop,
            width: gap,
            height: vOverlap,
            distance: gap,
          };
        }
      } else if (c.right <= R.left + eps) {
        const gap = R.left - c.right;
        if (gap >= eps && (!left || gap < left.distance)) {
          left = {
            left: c.right,
            top: vTop,
            width: gap,
            height: vOverlap,
            distance: gap,
          };
        }
      }
    }

    const hLeft = Math.max(R.left, c.left);
    const hRight = Math.min(R.right, c.right);
    const hOverlap = hRight - hLeft;
    if (hOverlap > 0) {
      if (c.top >= R.bottom - eps) {
        const gap = c.top - R.bottom;
        if (gap >= eps && (!bottom || gap < bottom.distance)) {
          bottom = {
            left: hLeft,
            top: R.bottom,
            width: hOverlap,
            height: gap,
            distance: gap,
          };
        }
      } else if (c.bottom <= R.top + eps) {
        const gap = R.top - c.bottom;
        if (gap >= eps && (!top || gap < top.distance)) {
          top = {
            left: hLeft,
            top: c.bottom,
            width: hOverlap,
            height: gap,
            distance: gap,
          };
        }
      }
    }
  }

  return [right, left, top, bottom].filter(Boolean) as MeasureBand[];
}
