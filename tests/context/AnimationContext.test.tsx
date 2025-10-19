import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("../../src/utils/svgTransform", () => {
  const readItemTransform = vi.fn(() => ({
    x: 12,
    y: 24,
    rotation: 15,
    scaleX: 1.5,
    scaleY: 0.75,
  }));

  return {
    readItemTransform,
    getRotationFromTransform: vi.fn(() => 30),
    setImageTransform: vi.fn(),
    parseTransformAttribute: vi.fn(() => ({
      translate: { x: 3, y: 4 },
    })),
  };
});

import {
  AnimationProvider,
  useAnimation,
  type AnimationState,
} from "../../src/context/AnimationContext";
import type { SceneItem } from "../../src/context/UiContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AnimationProvider>{children}</AnimationProvider>
);

const createPuppetItem = (): SceneItem => {
  const itemEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const puppetRoot = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  const memberSlot = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  memberSlot.id = "arm";
  memberSlot.setAttribute("data-membre", "");
  memberSlot.style.transform = "rotate(45deg)";

  const variantContainer = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  variantContainer.setAttribute("id", "variant-group");

  const variant = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  variant.setAttribute("data-variant-groupe", "variants");
  variant.setAttribute("data-variant-name", "main");
  variantContainer.appendChild(variant);

  memberSlot.appendChild(variantContainer);
  puppetRoot.appendChild(memberSlot);
  itemEl.appendChild(puppetRoot);

  return {
    id: "puppet-1",
    type: "puppet",
    label: "Puppet",
    el: itemEl,
    metadata: {
      id: "meta",
      source: "src",
      variantGroups: [
        {
          group: "variants",
          defaultVariantId: null,
          variants: [
            {
              targetMemberId: "variant-group",
              name: "main",
              isDefault: true,
            },
          ],
        },
      ],
    },
  };
};

const createImageItem = (): SceneItem => {
  const itemEl = document.createElementNS("http://www.w3.org/2000/svg", "image");
  itemEl.setAttribute("data-attached-to-puppet", "puppet-1");
  itemEl.setAttribute("data-attached-to-member", "arm");
  itemEl.setAttribute("x", "5");
  itemEl.setAttribute("y", "10");
  return {
    id: "image-1",
    type: "image",
    label: "Image",
    el: itemEl,
  };
};

const getAnimationApi = () =>
  renderHook<AnimationState, void>(() => useAnimation(), { wrapper }).result;

describe("AnimationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gère l'ajout, l'interpolation et la suppression des keyframes", () => {
    const animation = getAnimationApi();

    act(() => {
      animation.current.addKeyframe("item", null, "x", 0, 0);
      animation.current.addKeyframe("item", null, "x", 10, 100);
    });

    const track = animation.current.getTrack("item", null, "x");
    expect(track).toBeTruthy();
    expect(track?.keyframes).toHaveLength(2);
    expect(animation.current.getValueAtFrame("item", null, "x", 5)).toBe(50);

    act(() => animation.current.removeKeyframe(track!.id, 0));
    expect(animation.current.getTrack("item", null, "x")?.keyframes).toHaveLength(1);

    act(() => animation.current.removeKeyframe(track!.id, 10));
    expect(animation.current.getTrack("item", null, "x")).toBeUndefined();
  });

  it("capture l'état courant des éléments via snapshotKeyframes", () => {
    const animation = getAnimationApi();
    const puppet = createPuppetItem();
    const image = createImageItem();

    act(() => animation.current.snapshotKeyframes([puppet, image]));

    const tracks = animation.current.tracks;
    const byId = Object.fromEntries(tracks.map((t) => [t.id, t]));

    expect(byId["puppet-1:null:x"]?.keyframes[0]?.value).toBe(12);
    expect(byId["puppet-1:null:y"]?.keyframes[0]?.value).toBe(24);
    expect(byId["puppet-1:arm:rotation"]?.keyframes[0]?.value).toBe(45);
    expect(byId["puppet-1:variants:activeVariant"]?.keyframes[0]?.value).toBe(
      "main",
    );
    expect(byId["puppet-1:null:visible"]?.keyframes[0]?.value).toBe(true);
    expect(byId["image-1:null:attachment"]?.keyframes[0]?.value).toBe(
      "puppet-1:arm",
    );

    act(() => animation.current.removeAllTracksForTarget("puppet-1"));
    expect(animation.current.tracks.every((track) => track.targetId !== "puppet-1")).toBe(
      true,
    );
  });
});
