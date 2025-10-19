interface Keyframe {
  frame: number;
  type: "position" | "rotation" | "visible";
  axis?: "x" | "y";
  value?: any;
}

interface VisibilitySegment {
  start: number;
  end: number;
  visible: boolean;
}

interface TimelineTrackProps {
  /** Le nom de la piste, affiché sur le côté. */
  name: string;
  /** Le type d'élément associé à la piste (pantin ou image). */
  type: "puppet" | "image";
  /** La liste des keyframes à afficher sur la piste. */
  keyframes: Keyframe[];
  /** La liste des segments de visibilité à afficher. */
  visibilitySegments: VisibilitySegment[];
  /** La durée totale de l'animation. */
  duration: number;
  /** Le niveau de zoom de la timeline. */
  zoom: number;
  /** La frame actuelle, pour afficher la tête de lecture. */
  currentFrame: number;
  /** Callback appelé lors d'un clic sur une keyframe. */
  onKeyframeClick?: (keyframe: Keyframe) => void;
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
  onKeyframeClick,
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
                  className={`timeline-track-segment ${segment.visible ? "is-visible" : "is-hidden"}`}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                />
              );
            })}
          </div>

          {/* Keyframes */}
          {keyframes.map((keyframe, i) => {
            const left = keyframe.frame * pixelsPerFrame;
            let className = "timeline-keyframe";

            if (keyframe.type === "position") {
              className += ` position-${keyframe.axis}`;
            } else if (keyframe.type === "rotation") {
              className += " rotation";
            }

            return (
              <button
                key={`${keyframe.type}-${keyframe.axis}-${i}`}
                className={className}
                style={{ left }}
                onClick={() => onKeyframeClick?.(keyframe)}
                title={`${keyframe.type}${keyframe.axis ? ` ${keyframe.axis.toUpperCase()}` : ""} • Frame ${keyframe.frame}`}
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
