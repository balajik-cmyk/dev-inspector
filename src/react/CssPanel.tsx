import * as React from "react";
import { sectionToCss, specToCss } from "../core/inspectorCss";
import type { InspectorSection, InspectorSpec } from "../core/types";
import { CopyButton } from "./CopyButton";
import { IconX } from "./icons";
import styles from "../styles/inspector.module.css";

function SectionBlock({
  section,
  onCopied,
}: {
  section: InspectorSection;
  onCopied?: (text: string) => void;
}) {
  const css = section.properties
    .map((p) => `${p.name}: ${p.value};`)
    .join("\n");

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionTitle}>{section.title}</p>
        <CopyButton
          text={css}
          label={`Copy ${section.title} CSS`}
          onCopied={onCopied}
        />
      </div>
      <pre className={styles.codeBlock}>
        {section.properties.map((prop) => (
          <div key={prop.name}>
            <span className={styles.propName}>{prop.name}:</span> {prop.value};
          </div>
        ))}
      </pre>
    </div>
  );
}

export function CssPanel({
  spec,
  onClose,
  onCopy,
  showAnnotationForm,
  annotationForm,
  annotationList,
  embedded = false,
}: {
  spec: InspectorSpec;
  onClose: () => void;
  onCopy?: (text: string) => void;
  showAnnotationForm?: boolean;
  annotationForm?: React.ReactNode;
  annotationList?: React.ReactNode;
  embedded?: boolean;
}) {
  const allCss = specToCss(spec);

  return (
    <div className={embedded ? styles.panelEmbedded : styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <p className={styles.label}>{spec.label}</p>
          <p className={styles.selectorHint}>{spec.selectorHint}</p>
        </div>
        <div className={styles.panelActions}>
          <CopyButton text={allCss} label="Copy all CSS" onCopied={onCopy} />
          <button
            type="button"
            className={`${styles.btn} ${styles.btnIcon} ${styles.btnGhost}`}
            onClick={onClose}
            aria-label="Close inspector panel"
          >
            <IconX />
          </button>
        </div>
      </div>

      <div className={styles.panelBody}>
        {spec.sections.map((section) => (
          <SectionBlock
            key={section.title}
            section={section}
            onCopied={onCopy}
          />
        ))}
        {annotationList}
        {showAnnotationForm ? annotationForm : null}
      </div>
    </div>
  );
}

export { sectionToCss, specToCss };
