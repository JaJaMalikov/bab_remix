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
  /** Callback déclenché au début d'un drag. */
  onKeyframePointerDown: (
    keyframe: TimelineKeyframe,
    event: React.PointerEvent<HTMLButtonElement>,
    pixelsPerFrame: number,
  ) => void;
  /** Callback appelé lors d'un clic sur la piste de visibilité. */
  onVisibilityTrackClick?: (frame: number) => void;
}

export function TimelineTrack({
  name,
  type,
  keyframes,
  visibilitySegments,
  duration,
  zoom,
  currentFrame,
  selectedKeyframes,
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
                style={{ left }}
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
}
