import * as React from "react";
import { getFirebaseHandles } from "./firebaseClient";
import type {
  Comment,
  CommentAuthUser,
  CommentPinData,
  CommentReaction,
  CommentReply,
  DevInspectorFirebaseConfig,
} from "./types";
import {
  MAX_COMMENT_LENGTH,
  MAX_REPLIES_PER_COMMENT,
  MAX_REPLY_LENGTH,
} from "./types";

export type UseCommentsOptions = {
  firebaseConfig: DevInspectorFirebaseConfig;
  functionsRegion?: string;
  useEmulators?: boolean;
  pageId: string | null;
  user: CommentAuthUser | null;
};

export type UseCommentsResult = {
  comments: Comment[];
  loading: boolean;
  addComment: (body: string, pin: CommentPinData | null) => Promise<void>;
  editComment: (commentId: string, body: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleResolved: (commentId: string, resolved: boolean) => Promise<void>;
  addReply: (commentId: string, body: string) => Promise<void>;
  editReply: (commentId: string, replyId: string, body: string) => Promise<void>;
  deleteReply: (commentId: string, replyId: string) => Promise<void>;
  toggleReaction: (commentId: string, emoji: string) => Promise<void>;
};

const CONTROL_CHARS_RE = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]",
  "g",
);

function sanitizeBody(raw: string, maxLength: number): string {
  const trimmed = raw.trim().replace(CONTROL_CHARS_RE, "");
  return trimmed.slice(0, maxLength);
}

/**
 * Firestore-backed comments for the current `pageId`. Live-synced via
 * onSnapshot; unsubscribes and resubscribes whenever `pageId` changes
 * (e.g. SPA navigation).
 */
export function useComments({
  firebaseConfig,
  functionsRegion,
  useEmulators = false,
  pageId,
  user,
}: UseCommentsOptions): UseCommentsResult {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const fsRef = React.useRef<typeof import("firebase/firestore") | null>(null);
  const dbRef = React.useRef<import("firebase/firestore").Firestore | null>(null);

  const ensureFs = React.useCallback(async () => {
    const handles = await getFirebaseHandles({
      config: firebaseConfig,
      region: functionsRegion,
      useEmulators,
    });
    if (!fsRef.current) {
      fsRef.current = await import("firebase/firestore");
    }
    dbRef.current = handles.db;
    return { fs: fsRef.current, db: handles.db };
  }, [firebaseConfig, functionsRegion, useEmulators]);

  React.useEffect(() => {
    if (!pageId || !user) {
      setComments([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    setLoading(true);

    ensureFs().then(({ fs, db }) => {
      if (cancelled) return;
      const commentsCol = fs.collection(db, "pages", pageId, "comments");
      const q = fs.query(commentsCol, fs.orderBy("createdAt", "asc"));

      unsubscribe = fs.onSnapshot(q, async (snapshot) => {
        const rows = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data() as Record<string, unknown>;
            const [repliesSnap, reactionsSnap] = await Promise.all([
              fs.getDocs(
                fs.query(
                  fs.collection(db, "pages", pageId, "comments", docSnap.id, "replies"),
                  fs.orderBy("createdAt", "asc"),
                ),
              ),
              fs.getDocs(
                fs.collection(db, "pages", pageId, "comments", docSnap.id, "reactions"),
              ),
            ]);

            const replies: CommentReply[] = repliesSnap.docs.map((r) => {
              const rd = r.data() as Record<string, unknown>;
              return {
                id: r.id,
                body: String(rd.body ?? ""),
                author: rd.author as CommentReply["author"],
                createdAt: Number(rd.createdAt ?? 0),
                editedAt: rd.editedAt ? Number(rd.editedAt) : undefined,
              };
            });

            const reactions: CommentReaction[] = reactionsSnap.docs.map((r) => {
              const rd = r.data() as Record<string, unknown>;
              return { uid: String(rd.uid ?? ""), emoji: String(rd.emoji ?? "") };
            });

            const comment: Comment = {
              id: docSnap.id,
              pageId,
              body: String(data.body ?? ""),
              author: data.author as Comment["author"],
              createdAt: Number(data.createdAt ?? 0),
              editedAt: data.editedAt ? Number(data.editedAt) : undefined,
              resolved: Boolean(data.resolved),
              pin: (data.pin as CommentPinData | null) ?? null,
              replyCount: Number(data.replyCount ?? 0),
              replies,
              reactions,
            };
            return comment;
          }),
        );
        if (!cancelled) {
          setComments(rows);
          setLoading(false);
        }
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [ensureFs, pageId, user]);

  const requireAuth = React.useCallback(() => {
    if (!user || !pageId) throw new Error("Not signed in");
    return user;
  }, [user, pageId]);

  const addComment = React.useCallback(
    async (body: string, pin: CommentPinData | null) => {
      const authed = requireAuth();
      const clean = sanitizeBody(body, MAX_COMMENT_LENGTH);
      if (!clean) return;
      const { fs, db } = await ensureFs();
      await fs.addDoc(fs.collection(db, "pages", pageId!, "comments"), {
        body: clean,
        author: authed,
        authorUid: authed.uid,
        createdAt: Date.now(),
        resolved: false,
        pin,
        replyCount: 0,
      });
    },
    [ensureFs, pageId, requireAuth],
  );

  const editComment = React.useCallback(
    async (commentId: string, body: string) => {
      requireAuth();
      const clean = sanitizeBody(body, MAX_COMMENT_LENGTH);
      if (!clean) return;
      const { fs, db } = await ensureFs();
      await fs.updateDoc(fs.doc(db, "pages", pageId!, "comments", commentId), {
        body: clean,
        editedAt: Date.now(),
      });
    },
    [ensureFs, pageId, requireAuth],
  );

  const deleteComment = React.useCallback(
    async (commentId: string) => {
      requireAuth();
      const { fs, db } = await ensureFs();
      const repliesSnap = await fs.getDocs(
        fs.collection(db, "pages", pageId!, "comments", commentId, "replies"),
      );
      const reactionsSnap = await fs.getDocs(
        fs.collection(db, "pages", pageId!, "comments", commentId, "reactions"),
      );
      const batch = fs.writeBatch(db);
      repliesSnap.docs.forEach((d) => batch.delete(d.ref));
      reactionsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(fs.doc(db, "pages", pageId!, "comments", commentId));
      await batch.commit();
    },
    [ensureFs, pageId, requireAuth],
  );

  const toggleResolved = React.useCallback(
    async (commentId: string, resolved: boolean) => {
      requireAuth();
      const { fs, db } = await ensureFs();
      // Rules only permit the `resolved` field to change on this path —
      // send exactly that and nothing else.
      await fs.updateDoc(fs.doc(db, "pages", pageId!, "comments", commentId), {
        resolved,
      });
    },
    [ensureFs, pageId, requireAuth],
  );

  const addReply = React.useCallback(
    async (commentId: string, body: string) => {
      const authed = requireAuth();
      const clean = sanitizeBody(body, MAX_REPLY_LENGTH);
      if (!clean) return;
      const { fs, db } = await ensureFs();
      const commentRef = fs.doc(db, "pages", pageId!, "comments", commentId);
      await fs.runTransaction(db, async (tx) => {
        const snap = await tx.get(commentRef);
        const currentCount = Number(snap.data()?.replyCount ?? 0);
        if (currentCount >= MAX_REPLIES_PER_COMMENT) {
          throw new Error(`Reply limit reached (${MAX_REPLIES_PER_COMMENT}/${MAX_REPLIES_PER_COMMENT})`);
        }
        const replyRef = fs.doc(
          fs.collection(db, "pages", pageId!, "comments", commentId, "replies"),
        );
        tx.set(replyRef, {
          body: clean,
          author: authed,
          authorUid: authed.uid,
          createdAt: Date.now(),
        });
        tx.update(commentRef, { replyCount: currentCount + 1 });
      });
    },
    [ensureFs, pageId, requireAuth],
  );

  const editReply = React.useCallback(
    async (commentId: string, replyId: string, body: string) => {
      requireAuth();
      const clean = sanitizeBody(body, MAX_REPLY_LENGTH);
      if (!clean) return;
      const { fs, db } = await ensureFs();
      await fs.updateDoc(
        fs.doc(db, "pages", pageId!, "comments", commentId, "replies", replyId),
        { body: clean, editedAt: Date.now() },
      );
    },
    [ensureFs, pageId, requireAuth],
  );

  const deleteReply = React.useCallback(
    async (commentId: string, replyId: string) => {
      requireAuth();
      const { fs, db } = await ensureFs();
      const commentRef = fs.doc(db, "pages", pageId!, "comments", commentId);
      const replyRef = fs.doc(
        db,
        "pages",
        pageId!,
        "comments",
        commentId,
        "replies",
        replyId,
      );
      await fs.runTransaction(db, async (tx) => {
        const snap = await tx.get(commentRef);
        const currentCount = Number(snap.data()?.replyCount ?? 0);
        tx.delete(replyRef);
        tx.update(commentRef, { replyCount: Math.max(0, currentCount - 1) });
      });
    },
    [ensureFs, pageId, requireAuth],
  );

  const toggleReaction = React.useCallback(
    async (commentId: string, emoji: string) => {
      const authed = requireAuth();
      const { fs, db } = await ensureFs();
      const reactionRef = fs.doc(
        db,
        "pages",
        pageId!,
        "comments",
        commentId,
        "reactions",
        `${authed.uid}_${emoji}`,
      );
      const existing = await fs.getDoc(reactionRef);
      if (existing.exists()) {
        await fs.deleteDoc(reactionRef);
      } else {
        await fs.setDoc(reactionRef, { uid: authed.uid, emoji });
      }
    },
    [ensureFs, pageId, requireAuth],
  );

  return {
    comments,
    loading,
    addComment,
    editComment,
    deleteComment,
    toggleResolved,
    addReply,
    editReply,
    deleteReply,
    toggleReaction,
  };
}
