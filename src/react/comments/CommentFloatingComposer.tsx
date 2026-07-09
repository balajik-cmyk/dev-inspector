import * as React from "react";
import { INSPECTOR_ATTR } from "../../core/types";
import styles from "../../styles/inspector.module.css";
import { MAX_COMMENT_LENGTH } from "./types";

export type CommentFloatingComposerProps = {
  top: number;
  left: number;
  onSubmit: (body: string) => void | Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
};

function clampPosition(x: number, y: number, width = 300, height = 180) {
  const margin = 12;
  const left = Math.min(
    Math.max(x - width / 2, margin),
    window.innerWidth - width - margin,
  );
  const top = Math.min(
    Math.max(y + 14, margin),
    window.innerHeight - height - margin,
  );
  return { top, left };
}

/** Figma-style composer anchored near the click point on the page. */
export function CommentFloatingComposer({
  top,
  left,
  onSubmit,
  onCancel,
  disabled,
}: CommentFloatingComposerProps) {
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const pos = React.useMemo(() => clampPosition(left, top), [left, top]);

  React.useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting || disabled) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      {...{ [INSPECTOR_ATTR]: "" }}
      className={styles.commentFloatingComposer}
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
      aria-label="Add comment"
    >
      <textarea
        ref={textareaRef}
        className={styles.commentComposerTextarea}
        value={body}
        maxLength={MAX_COMMENT_LENGTH}
        placeholder="Add a comment…"
        rows={3}
        disabled={disabled || submitting}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      <div className={styles.commentFloatingComposerFooter}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
          disabled={disabled || submitting || !body.trim()}
          onClick={submit}
        >
          Post
        </button>
      </div>
    </div>
  );
}
