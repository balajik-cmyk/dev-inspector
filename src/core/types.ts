export type InspectorProperty = {
  name: string;
  value: string;
};

export type InspectorSection = {
  title: string;
  properties: InspectorProperty[];
};

export type InspectorSpec = {
  label: string;
  selectorHint: string;
  sections: InspectorSection[];
};

export type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
};

export type MeasureBand = {
  left: number;
  top: number;
  width: number;
  height: number;
  distance: number;
};

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Annotation = {
  id: string;
  comment: string;
  timestamp: number;
  element: string;
  elementPath: string;
  selectorHint: string;
  boundingBox: BoundingBox;
  cssSnippet?: string;
};

export type CaptureMode = "alt-click" | "armed-click";

export type DevInspectorTheme = "light" | "dark" | "auto";

export const INSPECTOR_ATTR = "data-dev-inspector";
export const MEASURE_COLOR = "#3b82f6";
export const MEASURE_HATCH = `repeating-linear-gradient(-45deg, ${MEASURE_COLOR}40 0, ${MEASURE_COLOR}40 1.5px, transparent 1.5px, transparent 6px)`;
