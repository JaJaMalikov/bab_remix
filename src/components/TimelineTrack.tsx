import React, { useState } from "react";
import { cn } from "../lib/utils";
import type {
  TimelineKeyframe,
  VisibilitySegment,
} from "../hooks/useTimelineData";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { useAnimation } from "../context/AnimationContext";

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
  /** Valeur copiée dans le clipboard. */
  copiedValue?: number | boolean | null;
  /** Callback déclenché au début d'un drag. */
  onKeyframePointerDown: (
    keyframe: TimelineKeyframe,
    event: React.PointerEvent<HTMLButtonElement>,
    pixelsPerFrame: number,
  ) => void;
  /** Callback appelé lors d'un clic sur la piste de visibilité. */
  onVisibilityTrackClick?: (frame: number) => void;
  /** Callback pour copier une valeur. */
  onCopyValue?: (value: number | boolean) => void;
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
    copiedValue,
    onKeyframePointerDown,
    onVisibilityTrackClick,
    onCopyValue,
  }: TimelineTrackProps) {
  const { removeKeyframe, addKeyframe, tracks } = useAnimation();

  const pixelsPerFrame = 2 * zoom;
  const totalWidth = duration * pixelsPerFrame;

  const icon = type === "puppet" ? "🪆" : "🖼️";

  // State for visual feedback on visibility track clicks
  const [clickFeedback, setClickFeedback] = useState<number | null>(null);

  const handleVisibilityClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onVisibilityTrackClick) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.max(0, Math.min(duration, Math.round(x / pixelsPerFrame)));

    // Visual feedback
    setClickFeedback(frame);
    setTimeout(() => setClickFeedback(null), 300);

    onVisibilityTrackClick(frame);
  };

  // Helper to prevent overlapping keyframes (X/Y at same frame)
  const getVerticalOffset = (kf: TrackKeyframe): string => {
    if (kf.type === "position" && kf.axis === "x") return "calc(50% - 4px)";
    if (kf.type === "position" && kf.axis === "y") return "calc(50% + 4px)";
    return "50%";
  };

  // Context menu actions
  const handleDeleteKeyframe = (keyframe: TrackKeyframe) => {
    const parts = keyframe.id.split(":");
    if (parts.length === 2) {
      removeKeyframe(parts[0], parseInt(parts[1], 10));
    }
  };

  const handleDuplicateKeyframe = (keyframe: TrackKeyframe) => {
    const track = tracks.find((t) => t.id === keyframe.trackId);
    if (!track) return;

    const newFrame = Math.min(keyframe.frame + 1, duration - 1);
    addKeyframe(
      track.targetId,
      track.targetMemberId,
      track.property,
      newFrame,
      keyframe.value
    );
  };

  const handleCopyValue = (keyframe: TrackKeyframe) => {
    if (onCopyValue) {
      onCopyValue(keyframe.value);
    }
  };

  const handlePasteValue = (keyframe: TrackKeyframe) => {
    if (copiedValue === null || copiedValue === undefined) return;

    const track = tracks.find((t) => t.id === keyframe.trackId);
    if (!track) return;

    // Supprimer l'ancienne keyframe
    const parts = keyframe.id.split(":");
    if (parts.length === 2) {
      removeKeyframe(parts[0], parseInt(parts[1], 10));
    }

    // Ajouter avec la nouvelle valeur
    addKeyframe(
      track.targetId,
      track.targetMemberId,
      track.property,
      keyframe.frame,
      copiedValue
    );
  };

  // Compter les keyframes sélectionnées dans ce track
  const selectedCount = keyframes.filter((kf) => selectedKeyframes.has(kf.id)).length;

  return (
    <div className="timeline-track">
      {/* Track label */}
      <div className="timeline-track-label" title={name}>
        <span className="timeline-track-label-icon">{icon}</span>
        <span className="timeline-track-label-text">{name}</span>
        {selectedCount > 0 && (
          <span className="timeline-selection-badge">{selectedCount}</span>
        )}
      </div>

      {/* Track content */}
      <div className="timeline-track-content" style={{ minWidth: totalWidth }}>
        <div className="timeline-track-canvas" style={{ width: totalWidth }}>
          {/* Visibility layer */}
          <div
            className="timeline-track-visibility"
            onClick={handleVisibilityClick}
            role="button"
            tabIndex={0}
            aria-label={`Visibility track for ${name}. Click to toggle visibility at a frame.`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                // Toggle visibility at current frame
                if (onVisibilityTrackClick) {
                  onVisibilityTrackClick(currentFrame);
                }
              }
            }}
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

            {/* Visual feedback for visibility track clicks */}
            {clickFeedback !== null && (
              <div
                className="timeline-visibility-click-feedback"
                style={{ left: clickFeedback * pixelsPerFrame }}
              />
            )}
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
              <ContextMenu key={keyframe.id}>
                <ContextMenuTrigger asChild>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
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
                        aria-pressed={isSelected}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onKeyframePointerDown(keyframe, event, pixelsPerFrame);
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <div className="text-center">
                        {tooltipParts.map((part, idx) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && <span className="text-primary-foreground/60"> • </span>}
                            {part}
                          </React.Fragment>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </ContextMenuTrigger>

                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => handleCopyValue(keyframe)}>
                    Copy Value
                    <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => handlePasteValue(keyframe)}
                    disabled={copiedValue === null || copiedValue === undefined}
                  >
                    Paste Value
                    <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleDuplicateKeyframe(keyframe)}>
                    Duplicate
                    <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => handleDeleteKeyframe(keyframe)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                    <ContextMenuShortcut>Del</ContextMenuShortcut>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
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
      prevProps.copiedValue === nextProps.copiedValue &&
      prevProps.onKeyframePointerDown === nextProps.onKeyframePointerDown &&
      prevProps.onVisibilityTrackClick === nextProps.onVisibilityTrackClick &&
      prevProps.onCopyValue === nextProps.onCopyValue &&
      // Allow currentFrame to change (playhead updates are cheap via inline style)
      prevProps.currentFrame === nextProps.currentFrame
    );
  }
);
