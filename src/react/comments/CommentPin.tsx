import * as React from "react";
import { INSPECTOR_ATTR } from "../../core/types";
import styles from "../../styles/inspector.module.css";
import type { HighlightRect } from "../../core/types";

export type CommentPinProps = {
  rect: HighlightRect;
  authorInitial: string;
  resolved: boolean;
  active: boolean;
  onClick: () => void;
};

/**
 * Teardrop pin anchored to an element's bounding box (top-right corner),
 * tagged with INSPECTOR_ATTR so it never becomes an inspect/pin target
 * itself. Hidden entirely by the caller when the target element cannot be
 * re-resolved (orphaned pin) — this component only renders when a rect
 * is available.
 */
export function CommentPin({ rect, authorInitial, resolved, active, onClick }: CommentPinProps) {
  return (
    <button
      type="button"
      {...{ [INSPECTOR_ATTR]: "" }}
      className={`${styles.commentPin} ${resolved ? styles.commentPinResolved : ""} ${
        active ? styles.commentPinActive : ""
      }`}
      style={{
        top: rect.top,
        left: rect.left + rect.width,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={`Open comment thread by ${authorInitial}`}
    >
      {authorInitial}
    </button>
  );
}
