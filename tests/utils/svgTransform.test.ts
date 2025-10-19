import { describe, it, expect, beforeEach } from "vitest";
import {
  setRotationWithOrigin,
  getRotationFromTransform,
  parseTransformAttribute,
  readGraphicTransform,
  readItemTransform,
  setImageTransform,
  resolveDimensions,
} from "../../src/utils/svgTransform";

// Mock for getBBox
global.SVGElement.prototype.getBBox = () => ({
  x: 10,
  y: 20,
  width: 100,
  height: 200,
  top: 20,
  left: 10,
  right: 110,
  bottom: 220,
  toJSON: () => ({ x: 10, y: 20, width: 100, height: 200 }),
});

describe("svgTransform utils", () => {
  let element: SVGGElement;

  beforeEach(() => {
    element = document.createElementNS("http://www.w3.org/2000/svg", "g");
  });

  describe("setRotationWithOrigin and getRotationFromTransform", () => {
    it("should set and get rotation", () => {
      setRotationWithOrigin(element, 45);
      expect(getRotationFromTransform(element)).toBe(45);
    });

    it("should return 0 for no rotation", () => {
      expect(getRotationFromTransform(element)).toBe(0);
    });

    it("should handle negative rotation", () => {
      setRotationWithOrigin(element, -90);
      expect(getRotationFromTransform(element)).toBe(-90);
    });

    it("should handle floating point rotations", () => {
      setRotationWithOrigin(element, 33.3);
      expect(getRotationFromTransform(element)).toBe(33.3);
    });
  });

  describe("parseTransformAttribute", () => {
    it("should parse translate, rotate, and scale", () => {
      element.setAttribute(
        "transform",
        "translate(10, 20) rotate(30) scale(2, 3)",
      );
      const result = parseTransformAttribute(element);
      expect(result.translate).toEqual({ x: 10, y: 20 });
      expect(result.rotate).toBe(30);
      expect(result.scale).toEqual({ x: 2, y: 3 });
    });

    it("should handle different separators", () => {
      element.setAttribute(
        "transform",
        "translate(10.5 20.5) rotate(-45) scale(0.5)",
      );
      const result = parseTransformAttribute(element);
      expect(result.translate).toEqual({ x: 10.5, y: 20.5 });
      expect(result.rotate).toBe(-45);
      expect(result.scale).toEqual({ x: 0.5, y: 0.5 });
    });

    it("should return null for missing parts", () => {
      element.setAttribute("transform", "rotate(30)");
      const result = parseTransformAttribute(element);
      expect(result.translate).toBeNull();
      expect(result.rotate).toBe(30);
      expect(result.scale).toBeNull();
    });
  });

  describe("readGraphicTransform", () => {
    it("should read rotation and scale", () => {
      element.setAttribute("transform", "rotate(30) scale(2, 3)");
      const result = readGraphicTransform(element);
      expect(result.rotation).toBe(30);
      expect(result.scaleX).toBe(2);
      expect(result.scaleY).toBe(3);
    });

    it("should return defaults for missing parts", () => {
      const result = readGraphicTransform(element);
      expect(result.rotation).toBe(0);
      expect(result.scaleX).toBe(1);
      expect(result.scaleY).toBe(1);
    });
  });

  describe("readItemTransform", () => {
    it("should read puppet transform (translate only)", () => {
      element.setAttribute("transform", "translate(50, 60) rotate(30)");
      const result = readItemTransform(element, "puppet");
      expect(result.x).toBe(50);
      expect(result.y).toBe(60);
      expect(result.rotation).toBe(0);
      expect(result.scaleX).toBe(1);
    });

    it("should read image transform (x, y, rotate, scale)", () => {
      element.setAttribute("x", "10");
      element.setAttribute("y", "20");
      element.setAttribute("transform", "rotate(45) scale(1.5)");
      const result = readItemTransform(element, "image");
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
      expect(result.rotation).toBe(45);
      expect(result.scaleX).toBe(1.5);
      expect(result.scaleY).toBe(1.5);
    });
  });

  describe("setImageTransform", () => {
    let image: SVGImageElement;
    beforeEach(() => {
      image = document.createElementNS("http://www.w3.org/2000/svg", "image");
      image.setAttribute("x", "10");
      image.setAttribute("y", "20");
      image.setAttribute("width", "100");
      image.setAttribute("height", "200");
    });

    it("should set transform for rotation and scale", () => {
      setImageTransform(image, 45, 1.5, 2);
      const transform = image.getAttribute("transform");
      expect(transform).toContain("rotate(45)");
      expect(transform).toContain("scale(1.5 2)");
      // Check centering
      const cx = 10 + 100 / 2;
      const cy = 20 + 200 / 2;
      expect(transform).toContain(`translate(${cx} ${cy})`);
      expect(transform).toContain(`translate(${-cx} ${-cy})`);
    });

    it("should remove transform if values are default", () => {
      setImageTransform(image, 0, 1, 1);
      expect(image.hasAttribute("transform")).toBe(false);
    });
  });

  describe("resolveDimensions", () => {
    it("should use attributes if present", () => {
      element.setAttribute("x", "5");
      element.setAttribute("y", "15");
      element.setAttribute("width", "50");
      element.setAttribute("height", "150");
      const dims = resolveDimensions(element);
      expect(dims).toEqual({ x: 5, y: 15, width: 50, height: 150 });
    });

    it("should use viewBox as fallback for width/height", () => {
      element.setAttribute("viewBox", "0 0 80 180");
      const dims = resolveDimensions(element);
      expect(dims.width).toBe(80);
      expect(dims.height).toBe(180);
    });

    it("should use getBBox as a last resort", () => {
      const dims = resolveDimensions(element);
      expect(dims).toEqual({ x: 10, y: 20, width: 100, height: 200 });
    });
  });
});
