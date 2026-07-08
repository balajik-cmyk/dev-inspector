import type { InspectorProperty, InspectorSection, InspectorSpec } from "./types";

export type { InspectorProperty, InspectorSection, InspectorSpec };

const SKIP_VALUES = new Set([
  "none",
  "normal",
  "auto",
  "initial",
  "inherit",
  "unset",
  "revert",
  "0px",
  "0",
  "0s",
  "0ms",
  "rgba(0, 0, 0, 0)",
  "transparent",
]);

function shouldInclude(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (SKIP_VALUES.has(v)) return false;
  if (v === "opacity: 1" || v === "1") return false;
  return true;
}

function addProp(
  props: InspectorProperty[],
  name: string,
  value: string,
): void {
  if (shouldInclude(value)) {
    props.push({ name, value: value.trim() });
  }
}

function shorthandBox(
  prefix: "padding" | "margin",
  style: CSSStyleDeclaration,
): InspectorProperty[] {
  const top = style.getPropertyValue(`${prefix}-top`);
  const right = style.getPropertyValue(`${prefix}-right`);
  const bottom = style.getPropertyValue(`${prefix}-bottom`);
  const left = style.getPropertyValue(`${prefix}-left`);

  const props: InspectorProperty[] = [];
  if (top === right && right === bottom && bottom === left) {
    addProp(props, prefix, top);
  } else {
    addProp(props, `${prefix}-top`, top);
    addProp(props, `${prefix}-right`, right);
    addProp(props, `${prefix}-bottom`, bottom);
    addProp(props, `${prefix}-left`, left);
  }
  return props;
}

function borderProps(style: CSSStyleDeclaration): InspectorProperty[] {
  const props: InspectorProperty[] = [];
  const width = style.borderTopWidth;
  const styleVal = style.borderTopStyle;
  const color = style.borderTopColor;

  const same =
    width === style.borderRightWidth &&
    width === style.borderBottomWidth &&
    width === style.borderLeftWidth &&
    styleVal === style.borderRightStyle &&
    styleVal === style.borderBottomStyle &&
    styleVal === style.borderLeftStyle &&
    color === style.borderRightColor &&
    color === style.borderBottomColor &&
    color === style.borderLeftColor;

  if (same && shouldInclude(width) && shouldInclude(styleVal)) {
    addProp(props, "border", `${width} ${styleVal} ${color}`.trim());
  } else {
    addProp(
      props,
      "border-top",
      `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`.trim(),
    );
    addProp(
      props,
      "border-right",
      `${style.borderRightWidth} ${style.borderRightStyle} ${style.borderRightColor}`.trim(),
    );
    addProp(
      props,
      "border-bottom",
      `${style.borderBottomWidth} ${style.borderBottomStyle} ${style.borderBottomColor}`.trim(),
    );
    addProp(
      props,
      "border-left",
      `${style.borderLeftWidth} ${style.borderLeftStyle} ${style.borderLeftColor}`.trim(),
    );
  }

  const radius = style.borderRadius;
  if (shouldInclude(radius)) {
    addProp(props, "border-radius", radius);
  }
  return props;
}

function insetProps(style: CSSStyleDeclaration): InspectorProperty[] {
  const props: InspectorProperty[] = [];
  if (style.position === "static") return props;

  addProp(props, "position", style.position);
  addProp(props, "top", style.top);
  addProp(props, "right", style.right);
  addProp(props, "bottom", style.bottom);
  addProp(props, "left", style.left);
  addProp(props, "z-index", style.zIndex);
  return props;
}

export function formatElementLabel(el: Element, rect?: DOMRect): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const classList = el.classList;
  const firstClass =
    classList.length > 0 ? `.${classList[0].replace(/\s/g, ".")}` : "";
  const size = rect
    ? ` · ${Math.round(rect.width)}×${Math.round(rect.height)}`
    : "";
  return `${tag}${id}${firstClass}${size}`;
}

export function formatSelectorHint(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const dataSlot = el.getAttribute("data-slot");
  const slot = dataSlot ? `[data-slot="${dataSlot}"]` : "";
  const classList = el.classList;
  const firstClass = classList.length > 0 ? `.${classList[0]}` : "";
  return `${tag}${id}${slot}${firstClass}`;
}

export function buildInspectorSpec(el: Element): InspectorSpec {
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  const layout: InspectorProperty[] = [];
  addProp(layout, "display", style.display);
  addProp(layout, "width", style.width);
  addProp(layout, "height", style.height);
  addProp(layout, "min-width", style.minWidth);
  addProp(layout, "min-height", style.minHeight);
  addProp(layout, "max-width", style.maxWidth);
  addProp(layout, "max-height", style.maxHeight);
  layout.push(...shorthandBox("padding", style));
  layout.push(...shorthandBox("margin", style));
  addProp(layout, "gap", style.gap);
  addProp(layout, "flex-direction", style.flexDirection);
  addProp(layout, "align-items", style.alignItems);
  addProp(layout, "justify-content", style.justifyContent);
  addProp(layout, "overflow", style.overflow);
  addProp(layout, "overflow-x", style.overflowX);
  addProp(layout, "overflow-y", style.overflowY);
  layout.push(...insetProps(style));

  const typography: InspectorProperty[] = [];
  addProp(typography, "font-family", style.fontFamily);
  addProp(typography, "font-size", style.fontSize);
  addProp(typography, "font-weight", style.fontWeight);
  addProp(typography, "line-height", style.lineHeight);
  addProp(typography, "letter-spacing", style.letterSpacing);
  addProp(typography, "color", style.color);
  addProp(typography, "text-align", style.textAlign);
  addProp(typography, "text-transform", style.textTransform);

  const background: InspectorProperty[] = [];
  addProp(background, "background-color", style.backgroundColor);
  addProp(background, "background-image", style.backgroundImage);
  addProp(background, "backdrop-filter", style.backdropFilter);

  const border = borderProps(style);

  const effects: InspectorProperty[] = [];
  addProp(effects, "box-shadow", style.boxShadow);
  if (style.opacity !== "1") {
    addProp(effects, "opacity", style.opacity);
  }
  addProp(effects, "filter", style.filter);

  const motion: InspectorProperty[] = [];
  const transition = style.transition;
  const isDefaultTransition =
    !transition ||
    transition === "all" ||
    transition.startsWith("all 0s") ||
    transition === "none";
  if (!isDefaultTransition) {
    addProp(motion, "transition", transition);
  } else {
    addProp(motion, "transition-property", style.transitionProperty);
    addProp(motion, "transition-duration", style.transitionDuration);
    addProp(
      motion,
      "transition-timing-function",
      style.transitionTimingFunction,
    );
    addProp(motion, "transition-delay", style.transitionDelay);
  }
  const animationName = style.animationName;
  if (animationName && animationName !== "none") {
    addProp(motion, "animation", style.animation);
    addProp(motion, "animation-name", animationName);
    addProp(motion, "animation-duration", style.animationDuration);
    addProp(
      motion,
      "animation-timing-function",
      style.animationTimingFunction,
    );
  }

  const sections: InspectorSection[] = [
    { title: "Layout", properties: layout },
    { title: "Typography", properties: typography },
    { title: "Background", properties: background },
    { title: "Border", properties: border },
    { title: "Effects", properties: effects },
    { title: "Transition", properties: motion },
  ].filter((s) => s.properties.length > 0);

  return {
    label: formatElementLabel(el, rect),
    selectorHint: formatSelectorHint(el),
    sections,
  };
}

export function sectionToCss(section: InspectorSection): string {
  return section.properties.map((p) => `  ${p.name}: ${p.value};`).join("\n");
}

export function specToCss(spec: InspectorSpec): string {
  const lines: string[] = [`/* ${spec.selectorHint} */`];
  for (const section of spec.sections) {
    lines.push("", `/* ${section.title} */`);
    for (const prop of section.properties) {
      lines.push(`${prop.name}: ${prop.value};`);
    }
  }
  return lines.join("\n").trim();
}
