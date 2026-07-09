import * as React from "react";
import { CommentsPanel } from "./CommentsPanel";
import { CommentPin } from "./CommentPin";
import { CommentHoverCard } from "./CommentHoverCard";
import { CommentFloatingComposer } from "./CommentFloatingComposer";
import { useAuth } from "./useAuth";
import { useComments } from "./useComments";
import { usePageUrl } from "./usePageUrl";
import { pinRectForComment, resolvePinnedElement } from "./resolvePinnedElement";
import type {
  Comment,
  CommentAuthUser,
  CommentPinData,
  DevInspectorFirebaseConfig,
} from "./types";
import {
  DEFAULT_ALLOWED_EMAIL_DOMAIN,
  DEFAULT_FUNCTIONS_REGION,
} from "./types";
import type { UseAuthResult } from "./useAuth";
import type { UseCommentsResult } from "./useComments";

type CommentDraft = {
  anchor: { x: number; y: number };
  pin: CommentPinData;
};

type CommentsSessionValue = {
  auth: UseAuthResult;
  commentsApi: UseCommentsResult;
  allowedEmailDomain: string;
  orphanedIds: Set<string>;
  pinEntries: Array<{
    comment: Comment;
    rect: ReturnType<typeof pinRectForComment>;
  }>;
  selectedCommentId: string | null;
  selectCommentInList: (id: string | null) => void;
  onClosePanel: () => void;
  onCommentAdd?: (comment: Comment) => void;
  onOpenFromPin: (commentId: string) => void;
  pinHoverId: string | null;
  setPinHoverId: (id: string | null) => void;
  showPins: boolean;
  showPanel: boolean;
  commentDraft: CommentDraft | null;
  onClearDraft: () => void;
};

const CommentsSessionContext = React.createContext<CommentsSessionValue | null>(
  null,
);

function useCommentsSession(): CommentsSessionValue {
  const ctx = React.useContext(CommentsSessionContext);
  if (!ctx) {
    throw new Error("Comments session hooks require CommentsProvider");
  }
  return ctx;
}

export type CommentsProviderProps = {
  firebaseConfig: DevInspectorFirebaseConfig;
  functionsRegion?: string;
  allowedEmailDomain?: string;
  commentsPageUrl?: string;
  useEmulators?: boolean;
  mockOtp?: boolean;
  mockOtpCode?: string;
  commentsHidden: boolean;
  widgetModeComment: boolean;
  dockExpanded: boolean;
  selectedCommentId: string | null;
  onSelectCommentId: (id: string | null) => void;
  commentDraft: CommentDraft | null;
  onClearDraft: () => void;
  onClosePanel: () => void;
  onCommentAdd?: (comment: Comment) => void;
  onCommentAuthChange?: (user: CommentAuthUser | null) => void;
  onOpenFromPin: (commentId: string) => void;
  pinLayoutTick: number;
  children: React.ReactNode;
};

export function CommentsProvider({
  firebaseConfig,
  functionsRegion = DEFAULT_FUNCTIONS_REGION,
  allowedEmailDomain = DEFAULT_ALLOWED_EMAIL_DOMAIN,
  commentsPageUrl,
  useEmulators = false,
  mockOtp = false,
  mockOtpCode,
  commentsHidden,
  widgetModeComment,
  dockExpanded,
  selectedCommentId,
  onSelectCommentId,
  commentDraft,
  onClearDraft,
  onClosePanel,
  onCommentAdd,
  onCommentAuthChange,
  onOpenFromPin,
  pinLayoutTick,
  children,
}: CommentsProviderProps) {
  const { pageId } = usePageUrl(commentsPageUrl);
  const [pinHoverId, setPinHoverId] = React.useState<string | null>(null);

  const auth = useAuth({
    firebaseConfig,
    functionsRegion,
    allowedEmailDomain,
    useEmulators,
    mockOtp,
    mockOtpCode,
    onAuthChange: onCommentAuthChange,
  });

  const commentsApi = useComments({
    firebaseConfig,
    functionsRegion,
    useEmulators,
    pageId: auth.user ? pageId : null,
    user: auth.user,
  });

  React.useEffect(() => {
    onSelectCommentId(null);
  }, [pageId, onSelectCommentId]);

  React.useEffect(() => {
    if (!selectedCommentId || commentsHidden) return;
    const el = document.querySelector(
      `[data-di-comment-id="${CSS.escape(selectedCommentId)}"]`,
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedCommentId, commentsHidden]);

  void pinLayoutTick;

  const showPins = widgetModeComment && !commentsHidden && Boolean(auth.user);
  const showPanel = dockExpanded && widgetModeComment && !commentsHidden;

  const pinEntries = React.useMemo(() => {
    if (!showPins) return [];
    return commentsApi.comments
      .filter((c) => c.pin)
      .map((c) => ({
        comment: c,
        rect: pinRectForComment(c.pin!),
      }));
  }, [commentsApi.comments, showPins, pinLayoutTick]);

  const orphanedIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const e of pinEntries) {
      if (!e.rect) ids.add(e.comment.id);
    }
    return ids;
  }, [pinEntries]);

  const selectCommentInList = React.useCallback(
    (id: string | null) => {
      onSelectCommentId(id);
      if (!id) return;
      const comment = commentsApi.comments.find((c) => c.id === id);
      if (comment?.pin) {
        const target = resolvePinnedElement(comment.pin);
        target?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    },
    [commentsApi.comments, onSelectCommentId],
  );

  const value: CommentsSessionValue = {
    auth,
    commentsApi,
    allowedEmailDomain,
    orphanedIds,
    pinEntries,
    selectedCommentId,
    selectCommentInList,
    onClosePanel,
    onCommentAdd,
    onOpenFromPin,
    pinHoverId,
    setPinHoverId,
    showPins,
    showPanel,
    commentDraft,
    onClearDraft,
  };

  return (
    <CommentsSessionContext.Provider value={value}>
      {children}
    </CommentsSessionContext.Provider>
  );
}

/** On-page teardrop pins + hover card (render under root, outside dock). */
export function CommentsPinsLayer() {
  const {
    pinEntries,
    selectedCommentId,
    onOpenFromPin,
    pinHoverId,
    setPinHoverId,
    showPins,
  } = useCommentsSession();

  if (!showPins) return null;

  const hovered = pinHoverId
    ? pinEntries.find((e) => e.comment.id === pinHoverId && e.rect)
    : undefined;

  return (
    <>
      {pinEntries.map(({ comment, rect }) =>
        rect ? (
          <div
            key={comment.id}
            onMouseEnter={() => setPinHoverId(comment.id)}
            onMouseLeave={() => setPinHoverId(null)}
          >
            <CommentPin
              rect={rect}
              authorInitial={comment.author.email.slice(0, 1).toUpperCase()}
              resolved={comment.resolved}
              active={selectedCommentId === comment.id}
              onClick={() => onOpenFromPin(comment.id)}
            />
          </div>
        ) : null,
      )}
      {hovered?.rect ? (
        <CommentHoverCard
          comment={hovered.comment}
          top={hovered.rect.top + 8}
          left={hovered.rect.left + hovered.rect.width + 12}
        />
      ) : null}
    </>
  );
}

/** Figma-style composer near the click point. */
export function CommentsFloatingLayer() {
  const { auth, commentsApi, commentDraft, onClearDraft, onCommentAdd } =
    useCommentsSession();

  if (!commentDraft || !auth.user) return null;

  return (
    <CommentFloatingComposer
      top={commentDraft.anchor.y}
      left={commentDraft.anchor.x}
      onCancel={onClearDraft}
      onSubmit={async (body) => {
        await commentsApi.addComment(body, commentDraft.pin);
        onCommentAdd?.({
          id: "pending",
          pageId: "",
          body,
          author: auth.user!,
          createdAt: Date.now(),
          resolved: false,
          pin: commentDraft.pin,
          replyCount: 0,
          replies: [],
          reactions: [],
        });
        onClearDraft();
      }}
    />
  );
}

/** Threads drawer (render inside the widget dock flex column). */
export function CommentsPanelSlot() {
  const {
    auth,
    commentsApi,
    allowedEmailDomain,
    orphanedIds,
    selectedCommentId,
    selectCommentInList,
    onClosePanel,
    showPanel,
  } = useCommentsSession();

  if (!showPanel) return null;

  return (
    <CommentsPanel
      auth={auth}
      commentsApi={commentsApi}
      allowedEmailDomain={allowedEmailDomain}
      selectedCommentId={selectedCommentId}
      onSelectComment={selectCommentInList}
      orphanedIds={orphanedIds}
      onClose={onClosePanel}
    />
  );
}
