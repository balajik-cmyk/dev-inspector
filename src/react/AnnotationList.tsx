import type { Annotation } from "../core/types";
import { CopyButton } from "./CopyButton";
import styles from "../styles/inspector.module.css";

export function AnnotationList({
  annotations,
  markdown,
  onCopy,
}: {
  annotations: Annotation[];
  markdown: string;
  onCopy?: (text: string) => void;
}) {
  if (annotations.length === 0) return null;

  return (
    <div className={styles.annotationList}>
      <div className={styles.annotationListHeader}>
        <p className={styles.annotationListTitle}>
          Annotations ({annotations.length})
        </p>
        <CopyButton
          text={markdown}
          label="Copy all annotations as markdown"
          onCopied={onCopy}
        />
      </div>
      {annotations.map((annotation) => (
        <div key={annotation.id} className={styles.annotationItem}>
          <p className={styles.annotationItemElement}>{annotation.element}</p>
          <p className={styles.annotationItemNote}>{annotation.comment}</p>
        </div>
      ))}
    </div>
  );
}
