import * as React from "react";
import styles from "../../styles/inspector.module.css";
import { ReactionPicker } from "./ReactionPicker";
import type { Comment, CommentAuthUser } from "./types";
import { MAX_REPLIES_PER_COMMENT, MAX_REPLY_LENGTH } from "./types";

export type CommentThreadProps = {
  comment: Comment;
  user: CommentAuthUser;
  active: boolean;
  orphaned: boolean;
  onSelect: () => void;
  onEdit: (body: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onToggleResolved: (resolved: boolean) => Promise<void>;
  onAddReply: (body: string) => Promise<void>;
  onEditReply: (replyId: string, body: string) => Promise<void>;
  onDeleteReply: (replyId: string) => Promise<void>;
  onToggleReaction: (emoji: string) => Promise<void>;
};

function relativeTime(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function CommentThread({
  comment,
  user,
  active,
  orphaned,
  onSelect,
  onEdit,
  onDelete,
  onToggleResolved,
  onAddReply,
  onEditReply,
  onDeleteReply,
  onToggleReaction,
}: CommentThreadProps) {
  const isAuthor = comment.author.uid === user.uid;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(comment.body);
  const [replyDraft, setReplyDraft] = React.useState("");
  const [replying, setReplying] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const atReplyLimit = comment.replyCount >= MAX_REPLIES_PER_COMMENT;

  const saveEdit = async () => {
    setBusy(true);
    try {
      await onEdit(draft);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const submitReply = async () => {
    if (!replyDraft.trim() || atReplyLimit) return;
    setBusy(true);
    try {
      await onAddReply(replyDraft);
      setReplyDraft("");
      setReplying(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      data-di-comment-id={comment.id}
      className={`${styles.commentThread} ${active ? styles.commentThreadActive : ""} ${
        comment.resolved ? styles.commentThreadResolved : ""
      }`}
      onClick={onSelect}
    >
      <header className={styles.commentThreadHeader}>
        <div className={styles.commentThreadMeta}>
          <span className={styles.commentAvatar} aria-hidden>
            {comment.author.email.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className={styles.commentAuthor}>{comment.author.email}</p>
            <p className={styles.commentTime}>
              {relativeTime(comment.createdAt)}
              {comment.editedAt ? " · edited" : ""}
              {comment.resolved ? " · resolved" : ""}
              {orphaned ? " · element missing" : ""}
            </p>
          </div>
        </div>
        <div className={styles.commentThreadActions} onClick={(e) => e.stopPropagation()}>
          {isAuthor && !editing ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
              onClick={() => {
                setDraft(comment.body);
                setEditing(true);
              }}
            >
              Edit
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
            onClick={() => onToggleResolved(!comment.resolved)}
          >
            {comment.resolved ? "Unresolve" : "Resolve"}
          </button>
          {isAuthor ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
              onClick={() => {
                if (window.confirm("Delete this comment and its replies?")) {
                  onDelete();
                }
              }}
            >
              Delete
            </button>
          ) : null}
        </div>
      </header>

      {editing ? (
        <div className={styles.commentEditBlock} onClick={(e) => e.stopPropagation()}>
          <textarea
            className={styles.commentComposerTextarea}
            value={draft}
            rows={3}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className={styles.commentAuthActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
              disabled={busy || !draft.trim()}
              onClick={saveEdit}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.commentBody}>{comment.body}</p>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <ReactionPicker
          reactions={comment.reactions}
          currentUid={user.uid}
          onToggle={onToggleReaction}
        />
      </div>

      {comment.replies.length ? (
        <ul className={styles.commentReplies}>
          {comment.replies.map((reply) => {
            const replyAuthor = reply.author.uid === user.uid;
            return (
              <li key={reply.id} className={styles.commentReply}>
                <p className={styles.commentReplyMeta}>
                  {reply.author.email} · {relativeTime(reply.createdAt)}
                  {reply.editedAt ? " · edited" : ""}
                </p>
                <p className={styles.commentBody}>{reply.body}</p>
                {replyAuthor ? (
                  <div className={styles.commentThreadActions}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                      onClick={async () => {
                        const next = window.prompt("Edit reply", reply.body);
                        if (next != null && next.trim()) {
                          await onEditReply(reply.id, next);
                        }
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                      onClick={() => {
                        if (window.confirm("Delete this reply?")) {
                          onDeleteReply(reply.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div onClick={(e) => e.stopPropagation()}>
        {replying ? (
          <div className={styles.commentReplyComposer}>
            <textarea
              className={styles.commentComposerTextarea}
              value={replyDraft}
              maxLength={MAX_REPLY_LENGTH}
              rows={2}
              placeholder="Write a reply…"
              onChange={(e) => setReplyDraft(e.target.value)}
            />
            <div className={styles.commentAuthActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                onClick={() => {
                  setReplying(false);
                  setReplyDraft("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                disabled={busy || !replyDraft.trim() || atReplyLimit}
                onClick={submitReply}
              >
                Reply
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
            disabled={atReplyLimit}
            onClick={() => setReplying(true)}
            title={
              atReplyLimit
                ? `Reply limit reached (${MAX_REPLIES_PER_COMMENT}/${MAX_REPLIES_PER_COMMENT})`
                : "Reply"
            }
          >
            {atReplyLimit
              ? `Reply limit (${MAX_REPLIES_PER_COMMENT}/${MAX_REPLIES_PER_COMMENT})`
              : "Reply"}
          </button>
        )}
      </div>
    </article>
  );
}
