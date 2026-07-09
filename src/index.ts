import "./styles/inspector.module.css";

export { DevInspector } from "./react/DevInspector";
export type { DevInspectorProps } from "./react/DevInspector";

export {
  formatAnnotationsMarkdown,
  formatSingleAnnotationMarkdown,
} from "./format/markdown";

export {
  buildInspectorSpec,
  formatElementLabel,
  formatSelectorHint,
  specToCss,
  sectionToCss,
} from "./core/inspectorCss";

export { buildElementPath } from "./core/selectors";
export { computeMeasureBands, findNeighborBands } from "./core/measure";
export {
  boundingBoxFromElement,
  isCaptureGesture,
  isInsideInspector,
  isMac,
  pickCommentTarget,
  pickInspectableElement,
  rectFromElement,
} from "./core/dom";

export { computePageId, normalizePageUrl, hashString } from "./core/pageId";
export { demoFirebaseConfig } from "./react/comments/firebaseClient";

export type {
  Annotation,
  BoundingBox,
  CaptureMode,
  DevInspectorTheme,
  DevInspectorLayout,
  HighlightRect,
  InspectorProperty,
  InspectorSection,
  InspectorSpec,
  MeasureBand,
} from "./core/types";

export { INSPECTOR_ATTR, MEASURE_COLOR } from "./core/types";

export type {
  Comment,
  CommentAuthor,
  CommentAuthUser,
  CommentPinData,
  CommentReaction,
  CommentReply,
  DevInspectorFirebaseConfig,
} from "./react/comments/types";

export {
  MAX_REPLIES_PER_COMMENT,
  MAX_COMMENT_LENGTH,
  MAX_REPLY_LENGTH,
  DEFAULT_ALLOWED_EMAIL_DOMAIN,
  DEFAULT_FUNCTIONS_REGION,
  DEFAULT_HIDE_SHORTCUT,
  DEFAULT_MOCK_OTP,
  REACTION_EMOJIS,
} from "./react/comments/types";
