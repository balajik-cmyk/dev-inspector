import * as React from "react";
import { IconCheck, IconCopy } from "./icons";
import styles from "../styles/inspector.module.css";

export function CopyButton({
  text,
  label,
  onCopied,
}: {
  text: string;
  label: string;
  onCopied?: (text: string) => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.(text);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [onCopied, text]);

  return (
    <button
      type="button"
      className={`${styles.btn} ${styles.btnSm}`}
      onClick={handleCopy}
      aria-label={label}
    >
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
