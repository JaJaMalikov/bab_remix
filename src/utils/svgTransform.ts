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

const parseNumber = (value: string | null, fallback: number): number => {
  const parsed = value === null ? NaN : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Apply rotation and scale transforms to an SVG image element, keeping it centered.
 */
export function setImageTransform(
  element: SVGImageElement,
  rotation: number,
  scaleX = 1,
  scaleY?: number,
): void {
  const x = parseNumber(element.getAttribute("x"), 0);
  const y = parseNumber(element.getAttribute("y"), 0);
  const width = parseNumber(element.getAttribute("width"), 0);
  const height = parseNumber(element.getAttribute("height"), 0);

  const cx = x + width / 2;
  const cy = y + height / 2;
  const finalRotation = Number.isFinite(rotation) ? rotation : 0;
  const finalScaleX = Number.isFinite(scaleX) ? scaleX : 1;
  const rawScaleY = scaleY ?? finalScaleX;
  const finalScaleY = Number.isFinite(rawScaleY) ? rawScaleY : 1;

  element.setAttribute(
    "transform",
    `rotate(${finalRotation} ${cx} ${cy}) scale(${finalScaleX} ${finalScaleY})`,
  );
}
