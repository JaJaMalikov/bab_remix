import { useMemo } from "react";
import type { SceneItem } from "../context/UiContext";
import type { AnimationTrack } from "../context/AnimationContext";
import { perfMonitor } from "../utils/performanceMonitor";

const MEASURE_INTERVAL = 4;
let timelineMeasureTick = 0;

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
  /** Member ID for puppet limb tracks, null for main item tracks */
  memberId?: string | null;
}

export const useTimelineData = (
  sceneItems: SceneItem[],
  tracks: AnimationTrack[],
  frameDivisor: number,
): ItemTrackData[] =>
  useMemo(() => {
    const shouldMeasure =
      perfMonitor.isEnabled() && timelineMeasureTick++ % MEASURE_INTERVAL === 0;

    if (shouldMeasure) {
      perfMonitor.startMeasure("timeline-data");
    }
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
          const clampedFrame = clamp(kf.frame, 0, frameDivisor);
          entry.keyframes.push({
            id: `${track.id}:${kf.frame}`,
            trackId: track.id,
            frame: clampedFrame,
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
          const clampedFrame = clamp(kf.frame, 0, frameDivisor);
          entry.keyframes.push({
            id: `${track.id}:${kf.frame}`,
            trackId: track.id,
            frame: clampedFrame,
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

    const result = Array.from(map.values()).map((entry) => ({
      id: entry.id,
      label: entry.label,
      type: entry.type,
      keyframes: entry.keyframes.sort((a, b) => a.frame - b.frame),
      visibility: buildVisibilitySegments(entry.visibilityMap),
    }));

    if (shouldMeasure) {
      perfMonitor.endMeasure("timeline-data");
    }

    return result;
  }, [sceneItems, tracks, frameDivisor]);
