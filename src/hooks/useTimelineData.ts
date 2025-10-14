import { useMemo } from 'react';
import type { SceneItem } from '../context/UiContext';
import type { Track } from '../context/AnimationContext';

// Helper
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Exported types for use in Timeline component
export type PositionKeyframe = { frame: number; axis: 'x' | 'y'; value: number };
export type RotationKeyframe = { frame: number; value: number };
export type VisibilitySegment = { start: number; end: number; visible: boolean };

export type ItemTrackData = {
  id: string;
  label: string;
  type: 'puppet' | 'image';
  position: PositionKeyframe[];
  rotation: RotationKeyframe[];
  visibility: VisibilitySegment[];
};

export const useTimelineData = (
  sceneItems: SceneItem[],
  tracks: Track[],
  frameDivisor: number,
): ItemTrackData[] => {
  return useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        label: string;
        type: 'puppet' | 'image';
        positionX: Map<number, number>;
        positionY: Map<number, number>;
        rotation: Map<number, number>;
        visibility: Map<number, boolean>;
      }
    >();

    sceneItems.forEach((item) => {
      map.set(item.id, {
        id: item.id,
        label: item.label,
        type: item.type,
        positionX: new Map(),
        positionY: new Map(),
        rotation: new Map(),
        visibility: new Map(),
      });
    });

    tracks.forEach((track) => {
      const entry = map.get(track.targetId);
      if (!entry) return;

      if (track.property === 'x' && track.targetMemberId === null) {
        track.keyframes.forEach((kf) => {
          const frame = clamp(kf.frame, 0, frameDivisor);
          const numericValue =
            typeof kf.value === 'number'
              ? kf.value
              : parseFloat(String(kf.value));
          if (!Number.isNaN(numericValue)) {
            entry.positionX.set(frame, numericValue);
          }
        });
      }

      if (track.property === 'y' && track.targetMemberId === null) {
        track.keyframes.forEach((kf) => {
          const frame = clamp(kf.frame, 0, frameDivisor);
          const numericValue =
            typeof kf.value === 'number'
              ? kf.value
              : parseFloat(String(kf.value));
          if (!Number.isNaN(numericValue)) {
            entry.positionY.set(frame, numericValue);
          }
        });
      }

      if (track.property === 'rotation' && track.targetMemberId === null) {
        track.keyframes.forEach((kf) => {
          const frame = clamp(kf.frame, 0, frameDivisor);
          const numericValue =
            typeof kf.value === 'number'
              ? kf.value
              : parseFloat(String(kf.value));
          if (!Number.isNaN(numericValue)) {
            entry.rotation.set(frame, numericValue);
          }
        });
      }

      if (track.property === 'visible' && track.targetMemberId === null) {
        track.keyframes.forEach((kf) => {
          const frame = clamp(kf.frame, 0, frameDivisor);
          entry.visibility.set(frame, Boolean(kf.value));
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

    return Array.from(map.values()).map((entry) => {
      const position: PositionKeyframe[] = [];
      entry.positionX.forEach((value, frame) => {
        position.push({ frame, value, axis: 'x' });
      });
      entry.positionY.forEach((value, frame) => {
        position.push({ frame, value, axis: 'y' });
      });
      position.sort((a, b) =>
        a.frame === b.frame ? (a.axis > b.axis ? 1 : -1) : a.frame - b.frame,
      );

      const rotation: RotationKeyframe[] = Array.from(entry.rotation.entries())
        .map(([frame, value]) => ({ frame, value }))
        .sort((a, b) => a.frame - b.frame);

      const visibility = buildVisibilitySegments(entry.visibility);

      return {
        id: entry.id,
        label: entry.label,
        type: entry.type,
        position,
        rotation,
        visibility,
      };
    });
  }, [sceneItems, tracks, frameDivisor]);
};
