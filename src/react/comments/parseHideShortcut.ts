/**
 * Parse `commentsHideShortcut` (default `"Shift+C"`) into a keydown matcher.
 * Returns null when shortcut is disabled (`false`).
 */
export function parseHideShortcut(
  shortcut: string | false | undefined,
): ((event: KeyboardEvent) => boolean) | null {
  if (shortcut === false) return null;
  const raw = (shortcut ?? "Shift+C").trim();
  if (!raw) return null;

  const parts = raw.split("+").map((p) => p.trim().toLowerCase());
  const key = parts[parts.length - 1] ?? "";
  const needShift = parts.includes("shift");
  const needAlt = parts.includes("alt") || parts.includes("option");
  const needMeta = parts.includes("meta") || parts.includes("cmd") || parts.includes("command");
  const needCtrl = parts.includes("ctrl") || parts.includes("control");

  return (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== key) return false;
    if (Boolean(event.shiftKey) !== needShift) return false;
    if (Boolean(event.altKey) !== needAlt) return false;
    if (Boolean(event.metaKey) !== needMeta) return false;
    if (Boolean(event.ctrlKey) !== needCtrl) return false;
    return true;
  };
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as { tagName?: string; isContentEditable?: boolean };
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
