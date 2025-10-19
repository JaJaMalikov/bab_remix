import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTimelineData } from "../../src/hooks/useTimelineData";
import type { SceneItem } from "../../src/context/UiContext";
import type { AnimationTrack } from "../../src/context/AnimationContext";

const createSceneItem = (overrides: Partial<SceneItem> = {}): SceneItem => ({
  id: "item-1",
  type: "image",
  label: "Image 1",
  el: document.createElement("div"),
  ...overrides,
});

const createTrack = (
  partial: Partial<AnimationTrack> & Pick<AnimationTrack, "property">,
): AnimationTrack => ({
  id: partial.id ?? `${partial.property}-track`,
  targetId: partial.targetId ?? "item-1",
  targetMemberId: partial.targetMemberId ?? null,
  property: partial.property,
  keyframes: partial.keyframes ?? [],
});

describe("useTimelineData", () => {
  it("aggregates position, rotation and visibility keyframes for each scene item", () => {
    const sceneItems: SceneItem[] = [createSceneItem()];
    const tracks: AnimationTrack[] = [
      createTrack({
        property: "x",
        keyframes: [
          { frame: 5, value: 10 },
          { frame: 25, value: 30 },
        ],
      }),
      createTrack({
        property: "y",
        keyframes: [{ frame: 10, value: 15 }],
      }),
      createTrack({
        property: "rotation",
        keyframes: [{ frame: 12, value: 45 }],
      }),
      createTrack({
        property: "visible",
        keyframes: [
          { frame: 0, value: true },
          { frame: 18, value: false },
        ],
      }),
      // Member-level tracks should be ignored by the hook
      createTrack({
        id: "member-track",
        targetMemberId: "arm",
        property: "x",
        keyframes: [{ frame: 8, value: 99 }],
      }),
    ];

    const { result } = renderHook(({ items, animationTracks, divisor }) =>
      useTimelineData(items, animationTracks, divisor),
    {
      initialProps: { items: sceneItems, animationTracks: tracks, divisor: 30 },
    });

    expect(result.current).toHaveLength(1);
    const [track] = result.current;
    expect(track.id).toBe("item-1");
    expect(track.label).toBe("Image 1");
    expect(track.position).toEqual([
      { frame: 5, axis: "x", value: 10 },
      { frame: 10, axis: "y", value: 15 },
      { frame: 25, axis: "x", value: 30 },
    ]);
    expect(track.rotation).toEqual([{ frame: 12, value: 45 }]);
    expect(track.visibility).toEqual([
      { start: 0, end: 18, visible: true },
      { start: 18, end: 30, visible: false },
    ]);
  });

  it("clamps keyframe frames to the divisor and ignores unknown items", () => {
    const sceneItems: SceneItem[] = [
      createSceneItem({ id: "item-1", label: "Primary" }),
    ];
    const tracks: AnimationTrack[] = [
      createTrack({
        property: "x",
        keyframes: [{ frame: 120, value: 42 }],
      }),
      {
        id: "foreign-track",
        targetId: "other-item",
        targetMemberId: null,
        property: "y",
        keyframes: [{ frame: 10, value: 99 }],
      },
    ];

    const { result } = renderHook(({ items, animationTracks, divisor }) =>
      useTimelineData(items, animationTracks, divisor),
    {
      initialProps: { items: sceneItems, animationTracks: tracks, divisor: 60 },
    });

    expect(result.current).toHaveLength(1);
    const [track] = result.current;
    expect(track.position).toEqual([{ frame: 60, axis: "x", value: 42 }]);
    expect(track.rotation).toEqual([]);
  });
});
