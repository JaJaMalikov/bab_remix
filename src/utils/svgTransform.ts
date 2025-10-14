/**
 * Utility functions for SVG transformations
 *
 * Note: transform-origin is already defined in the SVG source as a style attribute,
 * so we just need to use style.transform directly.
 */

/**
 * Set rotation on SVG element using CSS transform
 * The transform-origin is already in the element's style from the SVG source
 */
export function setRotationWithOrigin(element: SVGElement, degrees: number): void {
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

  if ((width === null || height === null || width === 0 || height === 0)) {
    const viewBox = element.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map((v) => parseFloat(v));
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
  const transformAttr = element.getAttribute("transform") || "";
  const rotMatch = transformAttr.match(/rotate\(([-+\d.]+)/);
  const scaleMatch = transformAttr.match(/scale\(([-+\d.]+)(?:[,\s]+([-\d.]+))?\)/);

  const rotation = rotMatch ? parseFloat(rotMatch[1] || "0") : 0;
  const scaleX = scaleMatch ? parseFloat(scaleMatch[1] || "1") : 1;
  const scaleY =
    scaleMatch && scaleMatch[2] !== undefined
      ? parseFloat(scaleMatch[2] || "1")
      : scaleX;

  return {
    rotation: Number.isFinite(rotation) ? rotation : 0,
    scaleX: Number.isFinite(scaleX) ? scaleX : 1,
    scaleY: Number.isFinite(scaleY) ? scaleY : 1,
  };
};

/**
 * Read transform values from any scene item (puppet or image)
 * Returns a unified transform object with x, y, rotation, scaleX, scaleY
 */
export function readItemTransform(
  element: Element,
  type: 'puppet' | 'image'
): { x: number; y: number; rotation: number; scaleX: number; scaleY: number } {
  if (type === 'puppet') {
    const transformAttr = element.getAttribute('transform') || '';
    const match = transformAttr.match(/translate\(([-\d.]+)[,\s]+([-\d.]+)\)/);
    return match
      ? { x: parseFloat(match[1] || '0'), y: parseFloat(match[2] || '0'), rotation: 0, scaleX: 1, scaleY: 1 }
      : { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
  } else {
    const x = parseFloat(element.getAttribute('x') || '0');
    const y = parseFloat(element.getAttribute('y') || '0');
    const transformAttr = element.getAttribute('transform') || '';
    const rotMatch = transformAttr.match(/rotate\(([-\d.]+)/);
    const scaleMatch = transformAttr.match(/scale\(([-\d.]+)(?:[,\s]+([-\d.]+))?\)/);
    return {
      x,
      y,
      rotation: rotMatch ? parseFloat(rotMatch[1] || '0') : 0,
      scaleX: scaleMatch ? parseFloat(scaleMatch[1] || '1') : 1,
      scaleY: scaleMatch?.[2] ? parseFloat(scaleMatch[2]) : (scaleMatch ? parseFloat(scaleMatch[1] || '1') : 1),
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
