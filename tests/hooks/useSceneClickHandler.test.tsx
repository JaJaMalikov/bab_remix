import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const mockGetRotation = vi.hoisted(() => vi.fn());

vi.mock("../../src/utils/svgTransform", () => ({
  getRotationFromTransform: mockGetRotation,
}));

import { useSceneClickHandler } from "../../src/hooks/useSceneClickHandler";
import type { SceneItem } from "../../src/context/UiContext";

const createSvgElement = <K extends keyof SVGElementTagNameMap>(tag: K) =>
  document.createElementNS("http://www.w3.org/2000/svg", tag);

describe("useSceneClickHandler", () => {
  beforeEach(() => {
    mockGetRotation.mockReset();
  });

  const setupHook = (sceneItems: SceneItem[]) => {
    const dragMovedRef = { current: false };
    const setSelectedItemId = vi.fn();
    const setUiSelectedPuppet = vi.fn();
    const setUiSelectedLimb = vi.fn();
    const setUiAngle = vi.fn();

    const { result } = renderHook(() =>
      useSceneClickHandler({
        dragMovedRef,
        sceneItems,
        setSelectedItemId,
        setUiSelectedPuppet,
        setUiSelectedLimb,
        setUiAngle,
      }),
    );

    return {
      onClick: result.current.onClick,
      dragMovedRef,
      setSelectedItemId,
      setUiSelectedPuppet,
      setUiSelectedLimb,
      setUiAngle,
    };
  };

  it("ignore le clic si le drag vient d'être effectué", () => {
    const { onClick, dragMovedRef, setSelectedItemId } = setupHook([]);

    dragMovedRef.current = true;
    onClick({ button: 0 } as MouseEvent);
    expect(dragMovedRef.current).toBe(false);
    expect(setSelectedItemId).not.toHaveBeenCalled();
  });

  it("sélectionne un pantin et un membre sur clic direct", () => {
    const anchor = createSvgElement("g");
    anchor.setAttribute("data-anchor", "puppet");
    anchor.setAttribute("data-id", "puppet-1");
    const puppetRoot = createSvgElement("g");
    const limb = createSvgElement("g");
    limb.id = "main-arm";
    limb.setAttribute("data-membre", "true");
    puppetRoot.appendChild(limb);
    anchor.appendChild(puppetRoot);

    const sceneItems: SceneItem[] = [
      {
        id: "puppet-1",
        type: "puppet",
        label: "Puppet",
        el: anchor,
      },
    ];

    const {
      onClick,
      setSelectedItemId,
      setUiSelectedLimb,
      setUiSelectedPuppet,
      setUiAngle,
    } = setupHook(sceneItems);

    mockGetRotation.mockReturnValue(33.6);
    onClick({ button: 0, target: limb } as unknown as MouseEvent);

    expect(setSelectedItemId).toHaveBeenCalledWith("puppet-1");
    expect(setUiSelectedPuppet).toHaveBeenCalledWith(puppetRoot);
    expect(setUiSelectedLimb).toHaveBeenCalledWith("main-arm");
    expect(setUiAngle).toHaveBeenCalledWith(34);
  });

  it("réinitialise le membre sélectionné lorsqu'on clique sur le pantin sans membre", () => {
    const anchor = createSvgElement("g");
    anchor.setAttribute("data-anchor", "puppet");
    anchor.setAttribute("data-id", "puppet-2");
    const puppetRoot = createSvgElement("g");
    anchor.appendChild(puppetRoot);

    const sceneItems: SceneItem[] = [
      {
        id: "puppet-2",
        type: "puppet",
        label: "Puppet",
        el: anchor,
      },
    ];

    const { onClick, setUiSelectedLimb } = setupHook(sceneItems);

    onClick({ button: 0, target: anchor } as unknown as MouseEvent);
    expect(setUiSelectedLimb).toHaveBeenCalledWith("");
  });

  it("sélectionne une image cliquée", () => {
    const image = createSvgElement("image");
    image.setAttribute("data-draggable", "true");
    image.setAttribute("data-id", "img-1");

    const sceneItems: SceneItem[] = [
      {
        id: "img-1",
        type: "image",
        label: "Image",
        el: image,
      },
    ];

    const { onClick, setSelectedItemId, setUiSelectedLimb } = setupHook(sceneItems);

    onClick({ button: 0, target: image } as unknown as MouseEvent);

    expect(setSelectedItemId).toHaveBeenCalledWith("img-1");
    expect(setUiSelectedLimb).toHaveBeenCalledWith("");
  });

  it("désélectionne tout lorsqu'on clique dans le vide", () => {
    const { onClick, setSelectedItemId, setUiSelectedLimb } = setupHook([]);
    const target = document.createElement("div");

    onClick({ button: 0, target } as unknown as MouseEvent);

    expect(setSelectedItemId).toHaveBeenCalledWith(null);
    expect(setUiSelectedLimb).toHaveBeenCalledWith("");
  });
});
