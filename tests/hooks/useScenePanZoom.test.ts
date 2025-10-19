import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useScenePanZoom } from "../../src/hooks/useScenePanZoom";

const createSvg = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.getBoundingClientRect = () =>
    ({
      width: 400,
      height: 200,
      left: 0,
      top: 0,
      right: 400,
      bottom: 200,
      x: 0,
      y: 0,
    }) as DOMRect;
  return svg;
};

describe("useScenePanZoom", () => {
  it("convertit les coordonnées client vers la scène", () => {
    const svg = createSvg();
    const viewport = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    const viewSizeRef = { current: { w: 200, h: 100 } };

    const { result } = renderHook(() =>
      useScenePanZoom({
        svgRef: { current: svg },
        viewportRef: { current: viewport },
        viewSizeRef,
      }),
    );

    const coords = result.current.toSceneCoords(200, 100);
    expect(coords).toEqual({ x: 100, y: 50 });
  });

  it("gère le zoom et le panoramique du viewport", () => {
    const svg = createSvg();
    const viewport = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    const viewSizeRef = { current: { w: 200, h: 100 } };

    const { result } = renderHook(() =>
      useScenePanZoom({
        svgRef: { current: svg },
        viewportRef: { current: viewport },
        viewSizeRef,
      }),
    );

    act(() => {
      result.current.onWheel({
        clientX: 200,
        clientY: 100,
        deltaX: 0,
        deltaY: -120,
        ctrlKey: true,
      } as unknown as WheelEvent);
    });

    expect(viewport.getAttribute("transform")).toMatch(
      /^translate\(-20 -10\) scale\(1\.19/,
    );

    act(() => {
      result.current.doFitInView();
    });
    expect(viewport.getAttribute("transform")).toBe(
      "translate(0 0) scale(1)",
    );

    act(() => {
      result.current.onWheel({
        clientX: 200,
        clientY: 100,
        deltaX: 15,
        deltaY: -10,
        ctrlKey: false,
      } as unknown as WheelEvent);
    });

    expect(viewport.getAttribute("transform")).toBe(
      "translate(-15 10) scale(1)",
    );
  });
});
