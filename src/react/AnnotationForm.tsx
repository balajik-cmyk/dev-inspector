import * as React from "react";
import styles from "../styles/inspector.module.css";

export function AnnotationForm({
  onSave,
  onCancel,
}: {
  onSave: (comment: string) => void;
  onCancel: () => void;
}) {
  const [comment, setComment] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setComment("");
  };

  return (
    <div className={styles.annotationForm}>
      <textarea
        ref={inputRef}
        className={styles.textarea}
        placeholder="Describe the issue or desired change…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSave();
          }
        }}
      />
      <div className={styles.formActions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSm}`}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
          onClick={handleSave}
          disabled={!comment.trim()}
        >
          Save annotation
        </button>
      </div>
    </div>
  );
}
