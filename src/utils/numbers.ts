/**
 * Shared utilities for parsing and validating numbers
 * Consolidates duplicated parseFloat logic across the codebase
 */

/**
 * Safely parse a string to a number with fallback
 * @param value - String value to parse
 * @param fallback - Fallback value if parsing fails (default: 0)
 * @returns Parsed number or fallback
 */
export function parseNumber(
  value: string | null | undefined,
  fallback = 0,
): number {
  if (value == null) return fallback;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Get a numeric attribute from an element
 * @param element - DOM element
 * @param name - Attribute name
 * @param fallback - Fallback value if attribute doesn't exist or is invalid (default: 0)
 * @returns Parsed number or fallback
 */
export function getNumberAttribute(
  element: Element,
  name: string,
  fallback = 0,
): number {
  return parseNumber(element.getAttribute(name), fallback);
}

/**
 * Parse multiple numeric attributes at once
 * @param element - DOM element
 * @param attributes - Map of attribute names to fallback values
 * @returns Object with parsed values
 */
export function getNumberAttributes<T extends Record<string, number>>(
  element: Element,
  attributes: T,
): T {
  const result = {} as T;
  for (const [name, fallback] of Object.entries(attributes)) {
    result[name as keyof T] = parseNumber(
      element.getAttribute(name),
      fallback,
    ) as T[keyof T];
  }
  return result;
}
