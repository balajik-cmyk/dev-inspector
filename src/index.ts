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
  pickInspectableElement,
  rectFromElement,
} from "./core/dom";

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
