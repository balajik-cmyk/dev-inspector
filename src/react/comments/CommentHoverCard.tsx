import * as React from "react";
import { INSPECTOR_ATTR } from "../../core/types";
import styles from "../../styles/inspector.module.css";
import type { Comment } from "./types";

export type CommentHoverCardProps = {
  comment: Comment;
  top: number;
  left: number;
};

function relativeTime(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function CommentHoverCard({ comment, top, left }: CommentHoverCardProps) {
  const initial = comment.author.email.slice(0, 1).toUpperCase();
  return (
    <div
      {...{ [INSPECTOR_ATTR]: "" }}
      className={styles.commentHoverCard}
      style={{ top, left }}
      role="tooltip"
    >
      <div className={styles.commentHoverCardHeader}>
        <span className={styles.commentAvatar} aria-hidden>
          {initial}
        </span>
        <div>
          <p className={styles.commentAuthor}>{comment.author.email}</p>
          <p className={styles.commentTime}>{relativeTime(comment.createdAt)}</p>
        </div>
      </div>
      <p className={styles.commentHoverCardBody}>{comment.body}</p>
    </div>
  );
}
