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
