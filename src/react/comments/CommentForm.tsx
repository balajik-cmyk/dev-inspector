import * as React from "react";
import styles from "../../styles/inspector.module.css";
import { MAX_COMMENT_LENGTH } from "./types";
import type { CommentPinData } from "./types";

export type CommentFormProps = {
  onSubmit: (body: string, pinMode: boolean) => void | Promise<void>;
  pinMode: boolean;
  onPinModeChange: (next: boolean) => void;
  pickingPin: boolean;
  pendingPin: CommentPinData | null;
  disabled?: boolean;
};

/**
 * Collapsed pill → expanded composer (UI reference).
 * Pin mode toggles element pick; emoji/@/image icons are visual placeholders.
 */
export function CommentForm({
  onSubmit,
  pinMode,
  onPinModeChange,
  pickingPin,
  pendingPin,
  disabled,
}: CommentFormProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (expanded) textareaRef.current?.focus();
  }, [expanded]);

  React.useEffect(() => {
    if (pendingPin) {
      setExpanded(true);
      onPinModeChange(true);
    }
  }, [pendingPin, onPinModeChange]);

  const submit = React.useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting || disabled) return;
    if (pinMode && pickingPin) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed, pinMode);
      setBody("");
      setExpanded(false);
      onPinModeChange(false);
    } finally {
      setSubmitting(false);
    }
  }, [body, submitting, disabled, onSubmit, pinMode, pickingPin, onPinModeChange]);

  if (!expanded) {
    return (
      <div className={styles.commentComposerCollapsed}>
        <button
          type="button"
          className={styles.commentComposerPill}
          onClick={() => setExpanded(true)}
          disabled={disabled}
        >
          <span className={styles.commentComposerPlaceholder}>Add a comment</span>
          <span className={styles.commentComposerSendIdle} aria-hidden>
            ↑
          </span>
        </button>
        <span
          className={`${styles.commentTeardrop} ${styles.commentTeardropGreen}`}
          aria-hidden
          title="Pin to element"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onPinModeChange(true);
            setExpanded(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPinModeChange(true);
              setExpanded(true);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.commentComposerExpanded}>
      <textarea
        ref={textareaRef}
        className={styles.commentComposerTextarea}
        value={body}
        maxLength={MAX_COMMENT_LENGTH}
        placeholder="Write a comment…"
        rows={3}
        disabled={disabled || submitting}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            setExpanded(false);
            setBody("");
            onPinModeChange(false);
          }
        }}
      />
      <div className={styles.commentComposerFooter}>
        <div className={styles.commentComposerTools}>
          <button type="button" className={styles.commentToolBtn} disabled title="Coming soon">
            🙂
          </button>
          <button type="button" className={styles.commentToolBtn} disabled title="Coming soon">
            @
          </button>
          <button type="button" className={styles.commentToolBtn} disabled title="Coming soon">
            🖼
          </button>
          <button
            type="button"
            className={`${styles.commentToolBtn} ${pinMode ? styles.commentToolBtnActive : ""}`}
            onClick={() => onPinModeChange(!pinMode)}
            aria-pressed={pinMode}
            title="Pin to element"
          >
            📍
          </button>
        </div>
        <div className={styles.commentComposerActions}>
          {pickingPin ? (
            <span className={styles.commentPinHint}>Click an element to pin · Esc to cancel</span>
          ) : null}
          <button
            type="button"
            className={styles.commentComposerSend}
            disabled={
              disabled ||
              submitting ||
              !body.trim() ||
              (pinMode && pickingPin)
            }
            onClick={submit}
            aria-label="Post comment"
          >
            ↑
          </button>
          <span
            className={`${styles.commentTeardrop} ${
              pinMode ? styles.commentTeardropBlue : styles.commentTeardropGreen
            }`}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
