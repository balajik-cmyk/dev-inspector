import * as React from "react";
import { buildInspectorSpec, formatSelectorHint, specToCss } from "../core/inspectorCss";
import {
  boundingBoxFromElement,
  isCaptureGesture,
  isInsideInspector,
  isMac,
  pickCommentTarget,
  pickInspectableElement,
  rectFromElement,
} from "../core/dom";
import { computeMeasureBands, findNeighborBands } from "../core/measure";
import { buildElementPath } from "../core/selectors";
import { formatAnnotationsMarkdown } from "../format/markdown";
import {
  INSPECTOR_ATTR,
  type Annotation,
  type CaptureMode,
  type DevInspectorTheme,
  type DevInspectorLayout,
  type HighlightRect,
  type InspectorSpec,
  type MeasureBand,
} from "../core/types";
import { AnnotationForm } from "./AnnotationForm";
import { AnnotationList } from "./AnnotationList";
import { CssPanel } from "./CssPanel";
import {
  IconCode,
  IconComment,
  IconCrosshair,
  IconPointer,
  IconX,
} from "./icons";
import { MeasureOverlay } from "./MeasureOverlay";
import { usePersistedState } from "./hooks/usePersistedState";
import {
  CommentsProvider,
  CommentsPinsLayer,
  CommentsPanelSlot,
  CommentsFloatingLayer,
} from "./comments/CommentsHost";
import {
  isEditableTarget,
  parseHideShortcut,
} from "./comments/parseHideShortcut";
import type {
  Comment,
  CommentAuthUser,
  CommentPinData,
  DevInspectorFirebaseConfig,
} from "./comments/types";
import {
  DEFAULT_ALLOWED_EMAIL_DOMAIN,
  DEFAULT_FUNCTIONS_REGION,
  DEFAULT_HIDE_SHORTCUT,
  DEFAULT_MOCK_OTP,
} from "./comments/types";
import styles from "../styles/inspector.module.css";

export type DevInspectorProps = {
  enabled?: boolean;
  captureMode?: CaptureMode;
  storageKey?: string;
  zIndex?: number;
  theme?: DevInspectorTheme;
  layout?: DevInspectorLayout;
  offsetBottom?: number;
  offsetRight?: number;
  onAnnotationAdd?: (annotation: Annotation) => void;
  onCopy?: (markdown: string) => void;
  copyToClipboard?: boolean;
  /** Opt-in Comments (v0.4). Requires `firebaseConfig`. */
  comments?: boolean;
  firebaseConfig?: DevInspectorFirebaseConfig;
  commentsFunctionsRegion?: string;
  commentsAllowedEmailDomain?: string;
  /** Host router URL for SPA pageId (preferred when available). */
  commentsPageUrl?: string;
  /** Default `"Shift+C"`; pass `false` to disable. */
  commentsHideShortcut?: string | false;
  /** Local dev: connect Auth/Firestore to Firebase emulators. */
  commentsUseEmulators?: boolean;
  /** Local dev: skip OTP email; verify with `commentsMockOtpCode` (default `000000`). */
  commentsMockOtp?: boolean;
  commentsMockOtpCode?: string;
  onCommentAdd?: (comment: Comment) => void;
  onCommentAuthChange?: (user: CommentAuthUser | null) => void;
};

type WidgetMode = "inspect" | "comment";

function shouldCaptureClick(
  event: MouseEvent | PointerEvent,
  captureMode: CaptureMode,
): boolean {
  if (captureMode === "armed-click") return true;
  return isCaptureGesture(event);
}

function createAnnotation(
  el: Element,
  spec: InspectorSpec,
  comment: string,
): Annotation {
  return {
    id: crypto.randomUUID(),
    comment,
    timestamp: Date.now(),
    element: spec.label,
    elementPath: buildElementPath(el),
    selectorHint: spec.selectorHint,
    boundingBox: boundingBoxFromElement(el),
    cssSnippet: specToCss(spec),
  };
}

function pinDataFromElement(el: Element): CommentPinData {
  return {
    elementPath: buildElementPath(el),
    selectorHint: formatSelectorHint(el),
    boundingBox: boundingBoxFromElement(el),
  };
}

export function DevInspector({
  enabled = true,
  captureMode = "alt-click",
  storageKey = "dev_inspector_armed",
  zIndex = 9999,
  theme = "auto",
  layout = "widget",
  offsetBottom = 24,
  offsetRight = 24,
  onAnnotationAdd,
  onCopy,
  copyToClipboard = true,
  comments = false,
  firebaseConfig,
  commentsFunctionsRegion = DEFAULT_FUNCTIONS_REGION,
  commentsAllowedEmailDomain = DEFAULT_ALLOWED_EMAIL_DOMAIN,
  commentsPageUrl,
  commentsHideShortcut = DEFAULT_HIDE_SHORTCUT,
  commentsUseEmulators = false,
  commentsMockOtp = false,
  commentsMockOtpCode = DEFAULT_MOCK_OTP,
  onCommentAdd,
  onCommentAuthChange,
}: DevInspectorProps) {
  const commentsEnabled = Boolean(comments && firebaseConfig);
  const commentsMisconfigured = Boolean(comments && !firebaseConfig);
  const useEmulators = commentsUseEmulators || commentsMockOtp;

  React.useEffect(() => {
    if (!commentsMisconfigured) return;
    console.error(
      "[DevInspector] `comments` is true but `firebaseConfig` is missing — Comments panel disabled.",
    );
  }, [commentsMisconfigured]);

  const [dockExpanded, setDockExpanded] = React.useState(false);
  const [widgetMode, setWidgetMode] = React.useState<WidgetMode>("inspect");
  const [armed, setArmed] = usePersistedState(storageKey, false);
  const [hoverRect, setHoverRect] = React.useState<HighlightRect | null>(null);
  const [selectedEl, setSelectedEl] = React.useState<Element | null>(null);
  const [selectedSpec, setSelectedSpec] = React.useState<InspectorSpec | null>(
    null,
  );
  const [selectedRect, setSelectedRect] = React.useState<HighlightRect | null>(
    null,
  );
  const [measureRect, setMeasureRect] = React.useState<HighlightRect | null>(
    null,
  );
  const [neighborBands, setNeighborBands] = React.useState<MeasureBand[]>([]);
  const [annotations, setAnnotations] = React.useState<Annotation[]>([]);
  const [showAnnotationForm, setShowAnnotationForm] = React.useState(false);

  const [commentsHidden, setCommentsHidden] = React.useState(false);
  const [selectedCommentId, setSelectedCommentId] = React.useState<string | null>(
    null,
  );
  const [commentDraft, setCommentDraft] = React.useState<{
    anchor: { x: number; y: number };
    pin: CommentPinData;
    targetRect: HighlightRect;
  } | null>(null);
  const [pinLayoutTick, setPinLayoutTick] = React.useState(0);
  const [commentAuthUser, setCommentAuthUser] = React.useState<CommentAuthUser | null>(
    null,
  );

  const clearCommentDraft = React.useCallback(() => {
    setCommentDraft(null);
  }, []);

  const handleCommentAuthChange = React.useCallback(
    (user: CommentAuthUser | null) => {
      setCommentAuthUser(user);
      onCommentAuthChange?.(user);
    },
    [onCommentAuthChange],
  );

  const clearSelection = React.useCallback(() => {
    setSelectedEl(null);
    setSelectedSpec(null);
    setSelectedRect(null);
    setMeasureRect(null);
    setShowAnnotationForm(false);
  }, []);

  const disarm = React.useCallback(() => {
    setArmed(false);
    setHoverRect(null);
    setMeasureRect(null);
    setNeighborBands([]);
    clearSelection();
  }, [clearSelection, setArmed]);

  const collapseDock = React.useCallback(() => {
    setDockExpanded(false);
    setWidgetMode("inspect");
    clearCommentDraft();
    disarm();
  }, [clearCommentDraft, disarm]);

  const activateInspect = React.useCallback(() => {
    setWidgetMode("inspect");
    clearCommentDraft();
    setArmed(true);
  }, [clearCommentDraft, setArmed]);

  const activateComment = React.useCallback(() => {
    setWidgetMode("comment");
    setCommentsHidden(false);
    disarm();
  }, [disarm]);

  React.useEffect(() => {
    if (widgetMode === "comment" && armed) {
      disarm();
    }
  }, [armed, disarm, widgetMode]);

  React.useEffect(() => {
    if (armed) setDockExpanded(true);
  }, [armed]);

  const refreshSelectedRect = React.useCallback(() => {
    if (!selectedEl) return;
    setSelectedRect(rectFromElement(selectedEl));
  }, [selectedEl]);

  const handleCopy = React.useCallback(
    async (text: string) => {
      onCopy?.(text);
      if (!copyToClipboard) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
    },
    [copyToClipboard, onCopy],
  );

  const handleSaveAnnotation = React.useCallback(
    (comment: string) => {
      if (!selectedEl || !selectedSpec) return;
      const annotation = createAnnotation(selectedEl, selectedSpec, comment);
      setAnnotations((prev) => [...prev, annotation]);
      onAnnotationAdd?.(annotation);
      setShowAnnotationForm(false);
    },
    [onAnnotationAdd, selectedEl, selectedSpec],
  );

  React.useEffect(() => {
    if (!enabled || !armed || selectedSpec) return;

    const onMove = (event: MouseEvent) => {
      if (isInsideInspector(event.target)) {
        setHoverRect(null);
        setNeighborBands([]);
        return;
      }
      const el = pickInspectableElement(event.clientX, event.clientY);
      setHoverRect(el ? rectFromElement(el) : null);
      setNeighborBands(el ? findNeighborBands(el) : []);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!shouldCaptureClick(event, captureMode)) return;
      if (isInsideInspector(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const onClick = (event: MouseEvent) => {
      if (!shouldCaptureClick(event, captureMode)) return;
      if (isInsideInspector(event.target)) return;
      const el = pickInspectableElement(event.clientX, event.clientY);
      if (!el) return;
      event.preventDefault();
      event.stopPropagation();
      setSelectedEl(el);
      setSelectedSpec(buildInspectorSpec(el));
      setSelectedRect(rectFromElement(el));
      setHoverRect(null);
      setNeighborBands([]);
      setShowAnnotationForm(false);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [armed, captureMode, enabled, selectedSpec]);

  React.useEffect(() => {
    if (!enabled || !armed || !selectedSpec || !selectedEl) return;

    const onMove = (event: MouseEvent) => {
      if (isInsideInspector(event.target)) {
        setMeasureRect(null);
        return;
      }
      const el = pickInspectableElement(event.clientX, event.clientY);
      if (!el || el === selectedEl) {
        setMeasureRect(null);
        return;
      }
      setMeasureRect(rectFromElement(el));
    };

    document.addEventListener("mousemove", onMove);
    return () => {
      document.removeEventListener("mousemove", onMove);
      setMeasureRect(null);
    };
  }, [armed, enabled, selectedEl, selectedSpec]);

  React.useEffect(() => {
    if (!enabled || !commentsEnabled || widgetMode !== "comment" || commentsHidden) {
      return;
    }
    if (!commentAuthUser) return;

    const onClick = (event: MouseEvent) => {
      if (isInsideInspector(event.target)) return;
      if (isEditableTarget(event.target)) return;
      const el = pickCommentTarget(event.clientX, event.clientY);
      if (!el) return;
      event.preventDefault();
      event.stopPropagation();
      setCommentDraft({
        anchor: { x: event.clientX, y: event.clientY },
        pin: pinDataFromElement(el),
        targetRect: rectFromElement(el),
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [
    commentAuthUser,
    commentsEnabled,
    commentsHidden,
    enabled,
    widgetMode,
  ]);

  React.useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (commentDraft) {
        clearCommentDraft();
        return;
      }

      if (commentsEnabled && widgetMode === "comment") {
        setWidgetMode("inspect");
        disarm();
        return;
      }

      if (armed) {
        if (showAnnotationForm) {
          setShowAnnotationForm(false);
          return;
        }
        if (selectedSpec) {
          clearSelection();
          return;
        }
        if (layout === "widget" && dockExpanded) {
          collapseDock();
          return;
        }
        disarm();
        return;
      }

      if (layout === "widget" && dockExpanded && !armed) {
        collapseDock();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    armed,
    clearSelection,
    commentDraft,
    clearCommentDraft,
    collapseDock,
    commentsEnabled,
    disarm,
    dockExpanded,
    enabled,
    layout,
    selectedSpec,
    showAnnotationForm,
    widgetMode,
  ]);

  React.useEffect(() => {
    if (!enabled || !commentsEnabled) return;
    const matches = parseHideShortcut(commentsHideShortcut);
    if (!matches) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const inCommentContext =
        dockExpanded && (widgetMode === "comment" || commentsHidden);
      if (!inCommentContext) return;
      if (!matches(event)) return;
      event.preventDefault();
      setCommentsHidden((h) => !h);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    commentsEnabled,
    commentsHidden,
    commentsHideShortcut,
    dockExpanded,
    enabled,
    widgetMode,
  ]);

  React.useEffect(() => {
    if (!selectedEl) return;
    const onLayout = () => refreshSelectedRect();
    window.addEventListener("scroll", onLayout, true);
    window.addEventListener("resize", onLayout);
    return () => {
      window.removeEventListener("scroll", onLayout, true);
      window.removeEventListener("resize", onLayout);
    };
  }, [refreshSelectedRect, selectedEl]);

  React.useEffect(() => {
    if (!commentsEnabled || widgetMode !== "comment" || commentsHidden) return;
    const bump = () => setPinLayoutTick((t) => t + 1);
    window.addEventListener("scroll", bump, true);
    window.addEventListener("resize", bump);
    const mo = new MutationObserver(bump);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("scroll", bump, true);
      window.removeEventListener("resize", bump);
      mo.disconnect();
    };
  }, [commentsEnabled, commentsHidden, widgetMode]);

  // Figma: C enters comment mode (Shift+C still hides pins/drawer).
  React.useEffect(() => {
    if (!enabled || !commentsEnabled || commentsHidden) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.key.toLowerCase() !== "c") return;
      if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      if (!dockExpanded) return;
      event.preventDefault();
      activateComment();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activateComment,
    commentsEnabled,
    commentsHidden,
    dockExpanded,
    enabled,
  ]);

  if (!enabled) return null;

  const activeRect = selectedRect ?? hoverRect;
  const measureBands =
    selectedRect && measureRect
      ? computeMeasureBands(selectedRect, measureRect)
      : [];
  const annotationsMarkdown = formatAnnotationsMarkdown(annotations);

  const themeClass =
    theme === "light"
      ? styles.themeLight
      : theme === "dark"
        ? styles.themeDark
        : "";

  const hintText =
    captureMode === "armed-click"
      ? "Click to inspect · Escape to exit"
      : `${isMac ? "⌥ Option" : "Alt"} + click to inspect · click to interact`;

  const showCommentStub = !comments && dockExpanded && widgetMode === "comment";

  const cssPanel = selectedSpec ? (
    <CssPanel
      spec={selectedSpec}
      onCopy={handleCopy}
      embedded={layout === "widget"}
      annotationList={
        <AnnotationList
          annotations={annotations}
          markdown={annotationsMarkdown}
          onCopy={handleCopy}
        />
      }
      showAnnotationForm={showAnnotationForm}
      annotationForm={
        <AnnotationForm
          onSave={handleSaveAnnotation}
          onCancel={() => setShowAnnotationForm(false)}
        />
      }
    />
  ) : null;

  const dockStyle = {
    bottom: offsetBottom,
    right: offsetRight,
  } as const;

  const commentModeActive =
    commentsEnabled && widgetMode === "comment" && !commentsHidden;

  const tree = (
    <div
      {...{ [INSPECTOR_ATTR]: "" }}
      className={`${styles.root} ${themeClass} ${
        commentModeActive ? styles.commentPlacementActive : ""
      }`.trim()}
      style={{ zIndex }}
    >
      {armed && activeRect ? (
        <div
          className={styles.highlight}
          style={{
            top: activeRect.top,
            left: activeRect.left,
            width: activeRect.width,
            height: activeRect.height,
          }}
        >
          <span className={styles.highlightLabel}>{activeRect.label}</span>
        </div>
      ) : null}

      {commentDraft ? (
        <div
          className={styles.commentTargetHighlight}
          style={{
            top: commentDraft.targetRect.top,
            left: commentDraft.targetRect.left,
            width: commentDraft.targetRect.width,
            height: commentDraft.targetRect.height,
          }}
        />
      ) : null}

      {armed && measureRect ? (
        <div
          className={styles.measureTarget}
          style={{
            top: measureRect.top,
            left: measureRect.left,
            width: measureRect.width,
            height: measureRect.height,
          }}
        >
          <span className={styles.measureTargetLabel}>
            {Math.round(measureRect.width)} × {Math.round(measureRect.height)}
          </span>
        </div>
      ) : null}

      {armed ? (
        <MeasureOverlay bands={selectedRect ? measureBands : neighborBands} />
      ) : null}

      {commentsEnabled ? <CommentsPinsLayer /> : null}
      {commentsEnabled ? <CommentsFloatingLayer /> : null}

      <div
        className={
          layout === "widget" ? styles.widgetDock : styles.controls
        }
        style={layout === "widget" ? dockStyle : undefined}
      >
        {layout === "widget" ? (
          <>
            {armed && widgetMode === "inspect" && selectedSpec ? (
              <div className={styles.widgetPanel}>
                <div className={styles.widgetHeader}>
                  <div className={styles.widgetHeaderMain}>
                    <IconCrosshair size={18} />
                    <span className={styles.widgetTitle}>Inspector</span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnIcon} ${styles.btnGhost}`}
                    onClick={clearSelection}
                    aria-label="Close inspector panel"
                  >
                    <IconX />
                  </button>
                </div>

                <div className={styles.widgetBody}>{cssPanel}</div>
              </div>
            ) : null}

            {commentsEnabled ? <CommentsPanelSlot /> : null}

            {showCommentStub ? (
              <p className={styles.widgetComingSoon} role="status">
                Comments coming soon
              </p>
            ) : null}

            {commentsMisconfigured &&
            dockExpanded &&
            widgetMode === "comment" ? (
              <p className={styles.widgetComingSoon} role="status">
                Comments need firebaseConfig
              </p>
            ) : null}

            {dockExpanded ? (
              <div
                className={styles.widgetToolbar}
                role="toolbar"
                aria-label="Dev Inspector"
              >
                <button
                  type="button"
                  className={`${styles.widgetToolBtn} ${styles.widgetToolBtnInspect} ${
                    widgetMode === "inspect" && armed
                      ? styles.widgetToolBtnActive
                      : ""
                  }`}
                  onClick={activateInspect}
                  aria-pressed={widgetMode === "inspect" && armed}
                  aria-label="Inspect"
                  title="Inspect"
                >
                  <IconPointer size={18} />
                </button>

                <button
                  type="button"
                  className={`${styles.widgetToolBtn} ${styles.widgetToolBtnComment} ${
                    widgetMode === "comment" && !commentsHidden
                      ? styles.widgetToolBtnActive
                      : ""
                  }`}
                  onClick={activateComment}
                  aria-pressed={widgetMode === "comment" && !commentsHidden}
                  aria-label={comments ? "Comment" : "Comment (coming soon)"}
                  title={comments ? "Comment" : "Comment (coming soon)"}
                >
                  <IconComment size={18} />
                </button>

                <span className={styles.widgetToolbarDivider} aria-hidden />

                <button
                  type="button"
                  className={styles.widgetCloseFab}
                  onClick={collapseDock}
                  aria-label="Collapse toolbar"
                  title="Collapse"
                >
                  <IconX size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.widgetFab}
                onClick={() => {
                  setDockExpanded(true);
                  activateInspect();
                }}
                aria-expanded={false}
                aria-label="Open inspector"
              >
                <IconCode size={20} />
              </button>
            )}
          </>
        ) : (
          <>
            {armed && !selectedSpec ? (
              <div className={styles.tooltip}>{hintText}</div>
            ) : null}

            {armed && selectedSpec ? (
              <div className={styles.tooltip}>
                Hover any element to measure spacing
              </div>
            ) : null}

            {cssPanel}

            <button
              type="button"
              className={`${styles.btn} ${armed ? `${styles.btnPrimary} ${styles.btnPrimaryActive}` : ""}`}
              onClick={() => {
                if (armed) {
                  disarm();
                } else {
                  setArmed(true);
                }
              }}
              aria-pressed={armed}
            >
              <IconCrosshair />
              {armed ? "Inspecting" : "Inspect"}
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (commentsEnabled && firebaseConfig) {
    return (
      <CommentsProvider
        firebaseConfig={firebaseConfig}
        functionsRegion={commentsFunctionsRegion}
        allowedEmailDomain={commentsAllowedEmailDomain}
        commentsPageUrl={commentsPageUrl}
        useEmulators={useEmulators}
        mockOtp={commentsMockOtp}
        mockOtpCode={commentsMockOtpCode}
        commentsHidden={commentsHidden}
        widgetModeComment={widgetMode === "comment"}
        dockExpanded={dockExpanded}
        selectedCommentId={selectedCommentId}
        onSelectCommentId={setSelectedCommentId}
        commentDraft={
          commentDraft
            ? { anchor: commentDraft.anchor, pin: commentDraft.pin }
            : null
        }
        onClearDraft={clearCommentDraft}
        onClosePanel={() => {
          setWidgetMode("inspect");
          clearCommentDraft();
        }}
        onCommentAdd={onCommentAdd}
        onCommentAuthChange={handleCommentAuthChange}
        onOpenFromPin={(id) => {
          setWidgetMode("comment");
          setCommentsHidden(false);
          setDockExpanded(true);
          setSelectedCommentId(id);
        }}
        pinLayoutTick={pinLayoutTick}
      >
        {tree}
      </CommentsProvider>
    );
  }

  return tree;
}
