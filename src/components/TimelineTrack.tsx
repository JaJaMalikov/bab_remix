import React from "react";
import { cn } from "../lib/utils";
import type {
  TimelineKeyframe,
  VisibilitySegment,
} from "../hooks/useTimelineData";

interface TrackKeyframe extends TimelineKeyframe {
  displayFrame: number;
}

interface TimelineTrackProps {
  /** Le nom de la piste, affiché sur le côté. */
  name: string;
  /** Le type d'élément associé à la piste (pantin ou image). */
  type: "puppet" | "image";
  /** La liste des keyframes à afficher sur la piste. */
  keyframes: TrackKeyframe[];
  /** La liste des segments de visibilité à afficher. */
  visibilitySegments: VisibilitySegment[];
  /** La durée totale de l'animation. */
  duration: number;
  /** Le niveau de zoom de la timeline. */
  zoom: number;
  /** La frame actuelle, pour afficher la tête de lecture. */
  currentFrame: number;
  /** Les keyframes actuellement sélectionnées. */
  selectedKeyframes: Set<string>;
  /** Offset de drag actuel (en frames). */
  dragOffset?: number;
  /** Callback déclenché au début d'un drag. */
  onKeyframePointerDown: (
    keyframe: TimelineKeyframe,
    event: React.PointerEvent<HTMLButtonElement>,
    pixelsPerFrame: number,
  ) => void;
  /** Callback appelé lors d'un clic sur la piste de visibilité. */
  onVisibilityTrackClick?: (frame: number) => void;
}

export const TimelineTrack = React.memo(
  function TimelineTrack({
    name,
    type,
    keyframes,
    visibilitySegments,
    duration,
    zoom,
    currentFrame,
    selectedKeyframes,
    dragOffset = 0,
    onKeyframePointerDown,
    onVisibilityTrackClick,
  }: TimelineTrackProps) {
  const pixelsPerFrame = 2 * zoom;
  const totalWidth = duration * pixelsPerFrame;

  const icon = type === "puppet" ? "🪆" : "🖼️";

  const handleVisibilityClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onVisibilityTrackClick) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.max(0, Math.min(duration, Math.round(x / pixelsPerFrame)));
    onVisibilityTrackClick(frame);
  };

  // Helper to prevent overlapping keyframes (X/Y at same frame)
  const getVerticalOffset = (kf: TrackKeyframe): string => {
    if (kf.type === "position" && kf.axis === "x") return "calc(50% - 4px)";
    if (kf.type === "position" && kf.axis === "y") return "calc(50% + 4px)";
    return "50%";
  };

  return (
    <div className="timeline-track">
      {/* Track label */}
      <div className="timeline-track-label" title={name}>
        <span className="timeline-track-label-icon">{icon}</span>
        <span className="timeline-track-label-text">{name}</span>
      </div>

      {/* Track content */}
      <div className="timeline-track-content" style={{ minWidth: totalWidth }}>
        <div className="timeline-track-canvas" style={{ width: totalWidth }}>
          {/* Visibility layer */}
          <div
            className="timeline-track-visibility"
            onClick={handleVisibilityClick}
          >
            {visibilitySegments.map((segment, index) => {
              const start = Math.max(0, segment.start);
              const end = Math.min(duration, segment.end);
              const leftPercent = (start / duration) * 100;
              const widthPercent = ((end - start) / duration) * 100;

              return (
                <div
                  key={index}
                  className={cn(
                    "timeline-track-segment",
                    segment.visible ? "is-visible" : "is-hidden",
                  )}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                />
              );
            })}
          </div>

          {/* Ghost keyframes (visual feedback during drag) */}
          {dragOffset !== 0 && keyframes
            .filter((kf) => selectedKeyframes.has(kf.id) && kf.frame !== kf.displayFrame)
            .map((keyframe) => {
              const originalLeft = keyframe.frame * pixelsPerFrame;
              return (
                <div
                  key={`ghost-${keyframe.id}`}
                  className={cn(
                    "timeline-keyframe-ghost",
                    keyframe.type === "position" && `position-${keyframe.axis}`,
                    keyframe.type === "rotation" && "rotation",
                    keyframe.type === "visibility" && "visibility",
                  )}
                  style={{
                    left: originalLeft,
                    top: getVerticalOffset(keyframe),
                  }}
                />
              );
            })}

          {/* Keyframes */}
          {keyframes.map((keyframe) => {
            const left = keyframe.displayFrame * pixelsPerFrame;
            const isSelected = selectedKeyframes.has(keyframe.id);
            const baseLabel =
              keyframe.type === "position"
                ? `Position${keyframe.axis ? ` ${keyframe.axis.toUpperCase()}` : ""}`
                : keyframe.type === "rotation"
                  ? "Rotation"
                  : "Visibilité";
            let valueText = "";
            if (keyframe.type === "visibility") {
              valueText = keyframe.value ? "Visible" : "Masquée";
            } else if (typeof keyframe.value === "number" && Number.isFinite(keyframe.value)) {
              const absolute = Math.abs(keyframe.value);
              valueText =
                absolute >= 100 || Number.isInteger(keyframe.value)
                  ? keyframe.value.toFixed(0)
                  : keyframe.value.toFixed(2);
            }
            const tooltipParts = [
              baseLabel,
              ...(valueText ? [valueText] : []),
              `Frame ${Math.round(keyframe.displayFrame)}`,
            ];

            return (
              <button
                type="button"
                key={keyframe.id}
                className={cn(
                  "timeline-keyframe",
                  keyframe.type === "position" && `position-${keyframe.axis}`,
                  keyframe.type === "rotation" && "rotation",
                  keyframe.type === "visibility" && "visibility",
                  isSelected && "is-selected",
                )}
                style={{
                  left,
                  top: getVerticalOffset(keyframe),
                }}
                title={tooltipParts.join(" • ")}
                aria-pressed={isSelected}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onKeyframePointerDown(keyframe, event, pixelsPerFrame);
                }}
              />
            );
          })}

          {/* Playhead indicator */}
          <div
            className="timeline-track-playhead"
            style={{ left: currentFrame * pixelsPerFrame }}
          />
        </div>
      </div>
    </div>
  );
  },
  (prevProps, nextProps) => {
    // Only re-render if data actually changed (not just currentFrame for playhead)
    // The playhead position is updated via style.left which doesn't require full re-render
    return (
      prevProps.name === nextProps.name &&
      prevProps.type === nextProps.type &&
      prevProps.keyframes === nextProps.keyframes &&
      prevProps.visibilitySegments === nextProps.visibilitySegments &&
      prevProps.duration === nextProps.duration &&
      prevProps.zoom === nextProps.zoom &&
      prevProps.selectedKeyframes === nextProps.selectedKeyframes &&
      prevProps.onKeyframePointerDown === nextProps.onKeyframePointerDown &&
      prevProps.onVisibilityTrackClick === nextProps.onVisibilityTrackClick &&
      // Allow currentFrame to change (playhead updates are cheap via inline style)
      prevProps.currentFrame === nextProps.currentFrame
    );
  }
);
