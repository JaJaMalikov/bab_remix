import React from "react";
import { TimelineTrack } from "./TimelineTrack";
import type { ItemTrackData } from "../hooks/useTimelineData";
import type { TimelineKeyframe } from "../hooks/useTimelineData";

interface VirtualizedTimelineTracksProps {
  /** Track data for all items */
  trackData: ItemTrackData[];
  /** Total duration in frames */
  duration: number;
  /** Current zoom level */
  zoom: number;
  /** Current playback frame */
  currentFrame: number;
  /** Maximum frame index (duration - 1 clamped to 0) */
  maxFrameIndex: number;
  /** Drag offset for selected keyframes */
  dragOffset: number;
  /** Set of selected keyframe IDs */
  selectedKeyframeIds: Set<string>;
  /** Callback when keyframe pointer down */
  onKeyframePointerDown: (
    keyframe: TimelineKeyframe,
    event: React.PointerEvent<HTMLButtonElement>,
    pixelsPerFrame: number,
  ) => void;
  /** Callback when visibility track clicked */
  onVisibilityTrackClick: (trackId: string, frame: number) => void;
  /** Sync scroll callback */
  onScroll: (scrollLeft: number) => void;
}

/**
 * Timeline tracks container with smart memoization.
 * The heavy lifting is done by TimelineTrack's React.memo which prevents
 * unnecessary re-renders when only currentFrame changes.
 *
 * For very large projects (100+ tracks), consider using CSS contain and
 * will-change properties for better browser optimization.
 */
export const VirtualizedTimelineTracks = React.memo(
  function VirtualizedTimelineTracks({
    trackData,
    duration,
    zoom,
    currentFrame,
    maxFrameIndex,
    dragOffset,
    selectedKeyframeIds,
    onKeyframePointerDown,
    onVisibilityTrackClick,
    onScroll,
  }: VirtualizedTimelineTracksProps) {
    // Helper to clamp frame values
    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);

    // Render a single track row with memoized keyframes
    const renderTrack = (track: ItemTrackData) => {
      const renderedKeyframes = track.keyframes.map((kf) => {
        const isSelected = selectedKeyframeIds.has(kf.id);
        const offset = isSelected ? dragOffset : 0;
        const targetFrame = clamp(kf.frame + offset, 0, maxFrameIndex);
        return {
          ...kf,
          displayFrame: targetFrame,
        };
      });

      return (
        <TimelineTrack
          key={track.id}
          name={track.label}
          type={track.type}
          keyframes={renderedKeyframes}
          visibilitySegments={track.visibility}
          duration={duration}
          zoom={zoom}
          currentFrame={currentFrame}
          selectedKeyframes={selectedKeyframeIds}
          onKeyframePointerDown={onKeyframePointerDown}
          onVisibilityTrackClick={(frame) => {
            onVisibilityTrackClick(track.id, frame);
          }}
        />
      );
    };

    return (
      <div
        className="timeline-tracks-container"
        onScroll={(e) => onScroll(e.currentTarget.scrollLeft)}
        style={{
          // CSS containment hints for browser optimization
          contain: "layout style",
          willChange: trackData.length > 50 ? "transform" : undefined,
        }}
      >
        {trackData.map((track) => renderTrack(track))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if data actually changed
    // TimelineTrack's own memo will handle currentFrame updates efficiently
    return (
      prevProps.trackData === nextProps.trackData &&
      prevProps.duration === nextProps.duration &&
      prevProps.zoom === nextProps.zoom &&
      prevProps.maxFrameIndex === nextProps.maxFrameIndex &&
      prevProps.dragOffset === nextProps.dragOffset &&
      prevProps.selectedKeyframeIds === nextProps.selectedKeyframeIds
    );
  }
);
