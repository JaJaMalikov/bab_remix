import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { RefObject } from "react";

const svgTransformMocks = vi.hoisted(() => ({
  readGraphicTransform: vi.fn(() => ({
    rotation: 30,
    scaleX: 1.2,
    scaleY: 0.8,
  })),
  setImageTransform: vi.fn(),
  parseTransformAttribute: vi.fn(() => ({
    translate: { x: 4, y: 6 },
  })),
}));

vi.mock("../../src/utils/svgTransform", () => svgTransformMocks);

import { useSceneDrag } from "../../src/hooks/useSceneDrag";

const createMouseEvent = (
  type: string,
  target: EventTarget,
  options: MouseEventInit,
) => {
  const event = new window.MouseEvent(type, { bubbles: true, ...options });
  Object.defineProperty(event, "composedPath", {
    configurable: true,
    value: () => [target],
  });
  return event;
};

const ensureSvgGlobals = () => {
  const svgElementCtor = window.SVGElement;
  const sampleImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
  const graphicsCtor = (sampleImage?.constructor as typeof SVGElement) || svgElementCtor;

  if (typeof (window as { SVGGElement?: typeof SVGElement }).SVGGElement === "undefined") {
    Object.defineProperty(window, "SVGGElement", {
      configurable: true,
      writable: true,
      value: svgElementCtor,
    });
    Object.defineProperty(globalThis, "SVGGElement", {
      configurable: true,
      writable: true,
      value: svgElementCtor,
    });
  }
  Object.defineProperty(window, "SVGGraphicsElement", {
    configurable: true,
    writable: true,
    value: graphicsCtor,
  });
  Object.defineProperty(globalThis, "SVGGraphicsElement", {
    configurable: true,
    writable: true,
    value: graphicsCtor,
  });
};

describe("useSceneDrag", () => {
  let svg: SVGSVGElement;
  let svgRef: RefObject<SVGSVGElement>;
  let svgAddSpy: ReturnType<typeof vi.spyOn>;
  let windowAddSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    ensureSvgGlobals();
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
    svgRef = { current: svg };
    svgAddSpy = vi.spyOn(svg, "addEventListener");
    windowAddSpy = vi.spyOn(window, "addEventListener");

    svgTransformMocks.readGraphicTransform.mockClear();
    svgTransformMocks.setImageTransform.mockClear();
    svgTransformMocks.parseTransformAttribute.mockClear();
  });

  afterEach(() => {
    svgAddSpy.mockRestore();
    windowAddSpy.mockRestore();
    document.body.innerHTML = "";
  });

  it("déplace une ancre de pantin et notifie les écouteurs", async () => {
    const toSceneCoords = vi.fn((x: number, y: number) => ({ x, y }));
    const { result, unmount } = renderHook(() =>
      useSceneDrag(svgRef, toSceneCoords),
    );

    await waitFor(() => expect(svgAddSpy).toHaveBeenCalled());

    const attachmentEvents: Array<CustomEvent> = [];
    const transformedEvents: Array<CustomEvent> = [];
    const onAttachment = (e: Event) => {
      attachmentEvents.push(e as CustomEvent);
    };
    const onTransformed = (e: Event) => {
      transformedEvents.push(e as CustomEvent);
    };
    window.addEventListener("attachment:update", onAttachment);
    window.addEventListener("item:transformed", onTransformed);

    const anchor = document.createElementNS("http://www.w3.org/2000/svg", "g");
    anchor.setAttribute("data-anchor", "puppet");
    anchor.setAttribute("data-id", "puppet-1");
    svg.appendChild(anchor);

    expect(svgAddSpy.mock.calls.map(([type]) => type)).toContain("mousedown");
    expect(windowAddSpy.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(["mousemove", "mouseup"]),
    );

    anchor.dispatchEvent(
      createMouseEvent("mousedown", anchor, {
        clientX: 10,
        clientY: 20,
        button: 0,
      }),
    );

    window.dispatchEvent(
      new window.MouseEvent("mousemove", { clientX: 35, clientY: 55 }),
    );

    expect(anchor.getAttribute("transform")).toBe("translate(29, 41)");
    expect(result.current.current).toBe(true);
    expect(attachmentEvents[0]?.detail.anchor).toBe(anchor);
    expect(transformedEvents[0]?.detail).toEqual({
      id: "puppet-1",
      final: false,
    });

    window.dispatchEvent(new window.MouseEvent("mouseup"));
    expect(transformedEvents.at(-1)?.detail).toEqual({
      id: "puppet-1",
      final: true,
    });
    expect(attachmentEvents.at(-1)?.detail.anchor).toBe(anchor);

    window.removeEventListener("attachment:update", onAttachment);
    window.removeEventListener("item:transformed", onTransformed);
    unmount();
  });

  it("déplace une image attachée et applique la transformation conservée", async () => {
    const toSceneCoords = vi.fn((x: number, y: number) => ({ x, y }));
    const { result, unmount } = renderHook(() => useSceneDrag(svgRef, toSceneCoords));

    await waitFor(() => expect(svgAddSpy).toHaveBeenCalled());

    const image = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "image",
    );
    image.setAttribute("data-draggable", "true");
    image.setAttribute("data-id", "image-1");
    image.setAttribute("x", "12");
    image.setAttribute("y", "18");
    image.setAttribute("transform", "rotate(15) scale(1.5)");
    svg.appendChild(image);

    expect(image instanceof (window as unknown as { SVGGraphicsElement: typeof SVGElement }).SVGGraphicsElement).toBe(true);

    const transformedEvents: Array<CustomEvent> = [];
    const onTransformed = (e: Event) => {
      transformedEvents.push(e as CustomEvent);
    };
    window.addEventListener("item:transformed", onTransformed);

    expect(svgAddSpy.mock.calls.map(([type]) => type)).toContain("mousedown");
    expect(windowAddSpy.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(["mousemove", "mouseup"]),
    );

    image.dispatchEvent(
      createMouseEvent("mousedown", image, {
        clientX: 20,
        clientY: 30,
        button: 0,
      }),
    );

    window.dispatchEvent(
      new window.MouseEvent("mousemove", { clientX: 40, clientY: 70 }),
    );

    expect(toSceneCoords.mock.calls.map((args) => args.slice(0, 2))).toEqual([
      [20, 30],
      [40, 70],
    ]);

    expect(image.getAttribute("x")).toBe("32");
    expect(image.getAttribute("y")).toBe("58");
    expect(result.current.current).toBe(true);
    expect(svgTransformMocks.readGraphicTransform).toHaveBeenCalledWith(image);
    expect(svgTransformMocks.setImageTransform).toHaveBeenCalledWith(
      image,
      30,
      1.2,
      0.8,
    );

    window.dispatchEvent(new window.MouseEvent("mouseup"));
    expect(transformedEvents.at(-1)?.detail).toEqual({
      id: "image-1",
      final: true,
    });
    window.removeEventListener("item:transformed", onTransformed);
    unmount();
  });
});
