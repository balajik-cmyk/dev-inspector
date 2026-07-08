import * as React from "react";
import { buildInspectorSpec, specToCss } from "../core/inspectorCss";
import {
  boundingBoxFromElement,
  isCaptureGesture,
  isInsideInspector,
  isMac,
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
  type HighlightRect,
  type InspectorSpec,
  type MeasureBand,
} from "../core/types";
import { AnnotationForm } from "./AnnotationForm";
import { AnnotationList } from "./AnnotationList";
import { CssPanel } from "./CssPanel";
import { IconCrosshair } from "./icons";
import { MeasureOverlay } from "./MeasureOverlay";
import { usePersistedState } from "./hooks/usePersistedState";
import styles from "../styles/inspector.module.css";

export type DevInspectorProps = {
  enabled?: boolean;
  captureMode?: CaptureMode;
  storageKey?: string;
  zIndex?: number;
  theme?: DevInspectorTheme;
  onAnnotationAdd?: (annotation: Annotation) => void;
  onCopy?: (markdown: string) => void;
  copyToClipboard?: boolean;
};

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

export function DevInspector({
  enabled = true,
  captureMode = "alt-click",
  storageKey = "dev_inspector_armed",
  zIndex = 9999,
  theme = "auto",
  onAnnotationAdd,
  onCopy,
  copyToClipboard = true,
}: DevInspectorProps) {
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
    if (!enabled || !armed) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showAnnotationForm) {
        setShowAnnotationForm(false);
        return;
      }
      if (selectedSpec) {
        clearSelection();
      } else {
        disarm();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    armed,
    clearSelection,
    disarm,
    enabled,
    selectedSpec,
    showAnnotationForm,
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

  return (
    <div
      {...{ [INSPECTOR_ATTR]: "" }}
      className={`${styles.root} ${themeClass}`.trim()}
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

      <div className={styles.controls}>
        {armed && !selectedSpec ? (
          <div className={styles.tooltip}>{hintText}</div>
        ) : null}

        {armed && selectedSpec ? (
          <div className={styles.tooltip}>
            Hover any element to measure spacing
          </div>
        ) : null}

        {armed && selectedSpec ? (
          <CssPanel
            spec={selectedSpec}
            onClose={clearSelection}
            onCopy={handleCopy}
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
        ) : null}

        {armed && selectedSpec && !showAnnotationForm ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSm}`}
            onClick={() => setShowAnnotationForm(true)}
          >
            Add annotation
          </button>
        ) : null}

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
      </div>
    </div>
  );
}
