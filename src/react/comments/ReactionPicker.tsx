import * as React from "react";
import styles from "../../styles/inspector.module.css";
import { REACTION_EMOJIS } from "./types";
import type { CommentReaction } from "./types";

export type ReactionPickerProps = {
  reactions: CommentReaction[];
  currentUid: string;
  onToggle: (emoji: string) => void;
};

/** Fixed reaction set (emoji picker/mentions are a v0.4.0+ follow-up). */
export function ReactionPicker({ reactions, currentUid, onToggle }: ReactionPickerProps) {
  const counts = React.useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of reactions) {
      const entry = map.get(r.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      if (r.uid === currentUid) entry.mine = true;
      map.set(r.emoji, entry);
    }
    return map;
  }, [reactions, currentUid]);

  return (
    <div className={styles.reactionPicker}>
      {REACTION_EMOJIS.map((emoji) => {
        const entry = counts.get(emoji);
        return (
          <button
            key={emoji}
            type="button"
            className={`${styles.reactionChip} ${entry?.mine ? styles.reactionChipActive : ""}`}
            onClick={() => onToggle(emoji)}
            aria-pressed={Boolean(entry?.mine)}
            title={emoji}
          >
            <span aria-hidden>{emoji}</span>
            {entry?.count ? <span className={styles.reactionCount}>{entry.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
