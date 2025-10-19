import { describe, it, expect } from "vitest";

import {
  parseNumber,
  getNumberAttribute,
  getNumberAttributes,
} from "../../src/utils/numbers";

describe("numbers utilities", () => {
  it("analyse correctement les nombres avec valeurs de secours", () => {
    expect(parseNumber("12.5")).toBe(12.5);
    expect(parseNumber("abc", 7)).toBe(7);
    expect(parseNumber(null, 3)).toBe(3);
  });

  it("lit les attributs numériques sur un élément", () => {
    const el = document.createElement("div");
    el.setAttribute("width", "128");
    el.setAttribute("height", "invalid");

    expect(getNumberAttribute(el, "width")).toBe(128);
    expect(getNumberAttribute(el, "height", 42)).toBe(42);
  });

  it("lit plusieurs attributs d'un coup", () => {
    const el = document.createElement("div");
    el.setAttribute("x", "10");

    const result = getNumberAttributes(el, { x: 0, y: 5 });
    expect(result).toEqual({ x: 10, y: 5 });
  });
});
