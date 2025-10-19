/**
 * Utility functions for SVG transformations
 *
 * Note: transform-origin is already defined in the SVG source as a style attribute,
 * so we just need to use style.transform directly.
 */

import { parseNumber } from "./numbers";

/**
 * Set rotation on SVG element using CSS transform
 * The transform-origin is already in the element's style from the SVG source
 */
export function setRotationWithOrigin(
  element: SVGElement,
  degrees: number,
): void {
  element.style.transform = `rotate(${degrees}deg)`;
}

/**
 * Get rotation from element's style.transform
 */
export function getRotationFromTransform(element: SVGElement): number {
  const t = element.style.transform || "";
  const rm = t.match(/rotate\(([-+\d.]+)deg\)/);
  if (!rm) return 0;
  const v = parseFloat(rm[1] || "0");
  return Number.isFinite(v) ? v : 0;
}

/**
 * Consolidated transform attribute parser
 * Parses translate, rotate, and scale from a transform attribute string
 */
export interface ParsedTransform {
  translate: { x: number; y: number } | null;
  rotate: number | null;
  scale: { x: number; y: number } | null;
}

export function parseTransformAttribute(element: Element): ParsedTransform {
  const transform = element.getAttribute("transform") ?? "";

  // Parse translate(x, y) or translate(x y)
  const translateMatch = transform.match(
    /translate\(([-+\d.]+)[,\s]+([-+\d.]+)\)/,
  );
  const translate = translateMatch
    ? {
        x: parseNumber(translateMatch[1], 0),
        y: parseNumber(translateMatch[2], 0),
      }
    : null;

  // Parse rotate(angle) or rotate(angle cx cy)
  const rotateMatch = transform.match(/rotate\(([-+\d.]+)/);
  const rotate = rotateMatch ? parseNumber(rotateMatch[1], 0) : null;

  // Parse scale(x) or scale(x y) or scale(x, y)
  const scaleMatch = transform.match(
    /scale\(([-+\d.]+)(?:[,\s]+([-+\d.]+))?\)/,
  );
  const scale = scaleMatch
    ? {
        x: parseNumber(scaleMatch[1], 1),
        y: scaleMatch[2]
          ? parseNumber(scaleMatch[2], 1)
          : parseNumber(scaleMatch[1], 1),
      }
    : null;

  return { translate, rotate, scale };
}

const toNumber = (value: string | null): number | null => {
  if (value === null) {
    return null;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const resolveDimensions = (
  element: SVGGraphicsElement,
): { x: number; y: number; width: number; height: number } => {
  let x = toNumber(element.getAttribute("x"));
  let y = toNumber(element.getAttribute("y"));
  let width = toNumber(element.getAttribute("width"));
  let height = toNumber(element.getAttribute("height"));

  if (width === null || height === null || width === 0 || height === 0) {
    const viewBox = element.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox
        .trim()
        .split(/[\s,]+/)
        .map((v) => parseFloat(v));
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        const [, , vbWidth, vbHeight] = parts;
        width = width === null || width === 0 ? vbWidth : width;
        height = height === null || height === 0 ? vbHeight : height;
        if (x === null) x = parts[0];
        if (y === null) y = parts[1];
      }
    }
  }

  if (x === null || y === null || width === null || height === null) {
    try {
      const bbox = element.getBBox();
      if (x === null) x = bbox.x;
      if (y === null) y = bbox.y;
      if (width === null || width === 0) width = bbox.width || 1;
      if (height === null || height === 0) height = bbox.height || 1;
    } catch {
      if (x === null) x = 0;
      if (y === null) y = 0;
      if (width === null || width === 0) width = 1;
      if (height === null || height === 0) height = 1;
    }
  }

  return { x, y, width, height };
};

/**
 * Parse the current rotate/scale values from an SVG graphic's transform attribute.
 */
export const readGraphicTransform = (
  element: SVGGraphicsElement,
): { rotation: number; scaleX: number; scaleY: number } => {
  const parsed = parseTransformAttribute(element);

  return {
    rotation: parsed.rotate ?? 0,
    scaleX: parsed.scale?.x ?? 1,
    scaleY: parsed.scale?.y ?? 1,
  };
};

/**
 * Read transform values from any scene item (puppet or image)
 * Returns a unified transform object with x, y, rotation, scaleX, scaleY
 */
export function readItemTransform(
  element: Element,
  type: "puppet" | "image",
): { x: number; y: number; rotation: number; scaleX: number; scaleY: number } {
  const parsed = parseTransformAttribute(element);

  if (type === "puppet") {
    return {
      x: parsed.translate?.x ?? 0,
      y: parsed.translate?.y ?? 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };
  } else {
    const x = parseNumber(element.getAttribute("x"), 0);
    const y = parseNumber(element.getAttribute("y"), 0);
    return {
      x,
      y,
      rotation: parsed.rotate ?? 0,
      scaleX: parsed.scale?.x ?? 1,
      scaleY: parsed.scale?.y ?? 1,
    };
  }
}

/**
 * Apply rotation and scale transforms to an SVG graphics element, keeping it centered.
 */
export function setImageTransform(
  element: SVGGraphicsElement,
  rotation: number,
  scaleX = 1,
  scaleY?: number,
): void {
  const { x, y, width, height } = resolveDimensions(element);
  const cx = x + width / 2;
  const cy = y + height / 2;
  const finalRotation = Number.isFinite(rotation) ? rotation : 0;
  const finalScaleX = Number.isFinite(scaleX) ? scaleX : 1;
  const rawScaleY = scaleY ?? finalScaleX;
  const finalScaleY = Number.isFinite(rawScaleY) ? rawScaleY : 1;

  const almostZero = (value: number) => Math.abs(value) < 1e-4;
  if (
    almostZero(finalRotation) &&
    almostZero(finalScaleX - 1) &&
    almostZero(finalScaleY - 1)
  ) {
    element.removeAttribute("transform");
    return;
  }

  element.setAttribute(
    "transform",
    [
      `translate(${cx} ${cy})`,
      `rotate(${finalRotation})`,
      `scale(${finalScaleX} ${finalScaleY})`,
      `translate(${-cx} ${-cy})`,
    ].join(" "),
  );
}
