import * as React from "react";
import styles from "../../styles/inspector.module.css";
import { CommentAuthGate } from "./CommentAuthGate";
import { CommentThread } from "./CommentThread";
import type { UseAuthResult } from "./useAuth";
import type { UseCommentsResult } from "./useComments";

export type CommentsPanelProps = {
  auth: UseAuthResult;
  commentsApi: UseCommentsResult;
  allowedEmailDomain: string;
  selectedCommentId: string | null;
  onSelectComment: (id: string | null) => void;
  orphanedIds: Set<string>;
  onClose: () => void;
};

export function CommentsPanel({
  auth,
  commentsApi,
  allowedEmailDomain,
  selectedCommentId,
  onSelectComment,
  orphanedIds,
  onClose,
}: CommentsPanelProps) {
  const { user, ready, signOut } = auth;
  const {
    comments,
    loading,
    editComment,
    deleteComment,
    toggleResolved,
    addReply,
    editReply,
    deleteReply,
    toggleReaction,
  } = commentsApi;

  if (!ready) {
    return (
      <div className={styles.widgetPanel}>
        <div className={styles.widgetHeader}>
          <div className={styles.widgetHeaderMain}>
            <span className={styles.widgetTitle}>Comments</span>
          </div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnIcon} ${styles.btnGhost}`}
            onClick={onClose}
            aria-label="Close comments"
          >
            ✕
          </button>
        </div>
        <div className={styles.widgetBody}>
          <p className={styles.commentAuthHint}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.widgetPanel}>
        <div className={styles.widgetHeader}>
          <div className={styles.widgetHeaderMain}>
            <span className={styles.widgetTitle}>Comments</span>
          </div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnIcon} ${styles.btnGhost}`}
            onClick={onClose}
            aria-label="Close comments"
          >
            ✕
          </button>
        </div>
        <div className={styles.widgetBody}>
          <CommentAuthGate auth={auth} allowedEmailDomain={allowedEmailDomain} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetHeader}>
        <div className={styles.widgetHeaderMain}>
          <span className={styles.widgetTitle}>Comments</span>
        </div>
        <div className={styles.commentPanelHeaderActions}>
          <span className={styles.commentUserEmail} title={user.email}>
            {user.email}
          </span>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
            onClick={signOut}
          >
            Sign out
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnIcon} ${styles.btnGhost}`}
            onClick={onClose}
            aria-label="Close comments"
          >
            ✕
          </button>
        </div>
      </div>

      <div className={styles.widgetBody}>
        <div className={styles.commentThreadList}>
          {loading ? <p className={styles.commentAuthHint}>Loading comments…</p> : null}
          {!loading && comments.length === 0 ? (
            <p className={styles.commentAuthHint}>
              Click any element on the page to add a comment.
            </p>
          ) : null}
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              user={user}
              active={selectedCommentId === comment.id}
              orphaned={orphanedIds.has(comment.id)}
              onSelect={() => onSelectComment(comment.id)}
              onEdit={(body) => editComment(comment.id, body)}
              onDelete={() => deleteComment(comment.id)}
              onToggleResolved={(resolved) => toggleResolved(comment.id, resolved)}
              onAddReply={(body) => addReply(comment.id, body)}
              onEditReply={(replyId, body) => editReply(comment.id, replyId, body)}
              onDeleteReply={(replyId) => deleteReply(comment.id, replyId)}
              onToggleReaction={(emoji) => toggleReaction(comment.id, emoji)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
