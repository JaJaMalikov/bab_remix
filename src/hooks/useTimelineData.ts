import { useMemo } from "react";
import type { SceneItem } from "../context/UiContext";
import type { AnimationTrack } from "../context/AnimationContext";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export interface TimelineKeyframe {
  id: string;
  trackId: string;
  frame: number;
  type: "position" | "rotation" | "visibility";
  axis?: "x" | "y";
  value: number | boolean;
}

export interface VisibilitySegment {
  start: number;
  end: number;
  visible: boolean;
}

export interface ItemTrackData {
  id: string;
  label: string;
  type: "puppet" | "image";
  keyframes: TimelineKeyframe[];
  visibility: VisibilitySegment[];
}

export const useTimelineData = (
  sceneItems: SceneItem[],
  tracks: AnimationTrack[],
  frameDivisor: number,
): ItemTrackData[] =>
  useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        label: string;
        type: "puppet" | "image";
        keyframes: TimelineKeyframe[];
        visibilityMap: Map<number, boolean>;
      }
    >();

    sceneItems.forEach((item) => {
      map.set(item.id, {
        id: item.id,
        label: item.label,
        type: item.type,
        keyframes: [],
        visibilityMap: new Map(),
      });
    });

    tracks.forEach((track) => {
      const entry = map.get(track.targetId);
      if (!entry || track.targetMemberId !== null) return;

      if (track.property === "x" || track.property === "y") {
        const axis: "x" | "y" = track.property === "x" ? "x" : "y";
        track.keyframes.forEach((kf) => {
          const numericValue = toNumber(kf.value);
          if (numericValue === null) return;
          entry.keyframes.push({
            id: `${track.id}:${kf.frame}`,
            trackId: track.id,
            frame: kf.frame,
            type: "position",
            axis,
            value: numericValue,
          });
        });
      }

      if (track.property === "rotation") {
        track.keyframes.forEach((kf) => {
          const numericValue = toNumber(kf.value);
          if (numericValue === null) return;
          entry.keyframes.push({
            id: `${track.id}:${kf.frame}`,
            trackId: track.id,
            frame: kf.frame,
            type: "rotation",
            value: numericValue,
          });
        });
      }

      if (track.property === "visible") {
        track.keyframes.forEach((kf) => {
          entry.visibilityMap.set(kf.frame, Boolean(kf.value));
          entry.keyframes.push({
            id: `${track.id}:${kf.frame}`,
            trackId: track.id,
            frame: kf.frame,
            type: "visibility",
            value: Boolean(kf.value),
          });
        });
      }
    });

    const buildVisibilitySegments = (
      visibilityMap: Map<number, boolean>,
    ): VisibilitySegment[] => {
      const entries = Array.from(visibilityMap.entries()).sort(
        (a, b) => a[0] - b[0],
      );
      const segments: VisibilitySegment[] = [];
      let cursor = 0;
      let currentVisible = true;

      entries.forEach(([frame, value]) => {
        const clampedFrame = clamp(frame, 0, frameDivisor);
        if (clampedFrame > cursor) {
          segments.push({
            start: cursor,
            end: clampedFrame,
            visible: currentVisible,
          });
        }
        currentVisible = value;
        cursor = clampedFrame;
      });

      if (cursor <= frameDivisor) {
        segments.push({
          start: cursor,
          end: frameDivisor,
          visible: currentVisible,
        });
      }

      return segments;
    };

    return Array.from(map.values()).map((entry) => ({
      id: entry.id,
      label: entry.label,
      type: entry.type,
      keyframes: entry.keyframes.sort((a, b) => a.frame - b.frame),
      visibility: buildVisibilitySegments(entry.visibilityMap),
    }));
  }, [sceneItems, tracks, frameDivisor]);
