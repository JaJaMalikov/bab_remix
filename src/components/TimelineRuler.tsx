import React, { useRef } from "react";
import { cn } from "../lib/utils";

interface TimelineRulerProps {
  /** La durée totale de l'animation en frames. */
  duration: number;
  /** La frame actuellement affichée. */
  currentFrame: number;
  /** Le niveau de zoom de la timeline. */
  zoom: number;
  /** La cadence d'image (images par seconde). */
  fps: number;
  /** Callback appelé lorsque l'utilisateur clique ou glisse sur la règle pour changer de frame. */
  onSeek: (frame: number) => void;
  /** Callback optionnel appelé lorsque l'utilisateur zoome avec la molette de la souris. */
  onZoom?: (delta: number) => void;
}

export function TimelineRuler({
  duration,
  currentFrame,
  zoom,
  fps,
  onSeek,
  onZoom,
}: TimelineRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);

  const pixelsPerFrame = 2 * zoom;
  const totalWidth = duration * pixelsPerFrame;
  const framesPerSecond = Math.max(1, Math.round(fps));

  // Generate tick marks based on frames
  const generateTicks = () => {
    const ticks = [];

    // Determine interval based on zoom
    let frameInterval: number;
    if (zoom >= 3) {
      frameInterval = Math.max(1, Math.round(framesPerSecond / 8));
    } else if (zoom >= 2) {
      frameInterval = Math.max(1, Math.round(framesPerSecond / 4));
    } else if (zoom >= 1) {
      frameInterval = Math.max(1, Math.round(framesPerSecond / 2));
    } else if (zoom >= 0.5) {
      frameInterval = framesPerSecond;
    } else if (zoom >= 0.25) {
      frameInterval = framesPerSecond * 2;
    } else {
      frameInterval = framesPerSecond * 4;
    }

    const majorInterval = framesPerSecond;

    for (let frame = 0; frame <= duration; frame += frameInterval) {
      const isMajor = frame % majorInterval === 0;
      const seconds = frame / framesPerSecond;
      const label =
        isMajor && Number.isFinite(seconds)
          ? `${seconds % 1 === 0 ? seconds.toFixed(0) : seconds.toFixed(1)}s`
          : null;
      ticks.push({
        frame,
        position: frame * pixelsPerFrame,
        isMajor,
        label,
      });
    }

    if (ticks.length === 0 || ticks[ticks.length - 1].frame < duration) {
      const frame = duration;
      const isMajor = frame % majorInterval === 0;
      const seconds = frame / framesPerSecond;
      const label =
        isMajor && Number.isFinite(seconds)
          ? `${seconds % 1 === 0 ? seconds.toFixed(0) : seconds.toFixed(1)}s`
          : null;
      ticks.push({
        frame,
        position: frame * pixelsPerFrame,
        isMajor,
        label,
      });
    }

    return ticks;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.shiftKey) return;

    if (rulerRef.current) {
      const rect = rulerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const frame = Math.max(0, Math.min(duration, Math.round(x / pixelsPerFrame)));
      onSeek(frame);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const delta = -e.deltaY;
      onZoom?.(delta);
    }
  };

  const ticks = generateTicks();

  return (
    <div className="timeline-ruler-container">
      <div className="timeline-ruler-spacer">Temps</div>

      <div className="timeline-ruler-content" style={{ minWidth: totalWidth }}>
        <div
          ref={rulerRef}
          className="timeline-ruler"
          style={{ width: totalWidth }}
          onClick={handleClick}
          onWheel={handleWheel}
        >
          {/* Ticks */}
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="timeline-ruler-tick"
              style={{ left: tick.position }}
            >
              <div
                className={cn(
                  "timeline-ruler-tick-line",
                  tick.isMajor ? "major" : "minor",
                )}
              />
              {tick.label && (
                <div className="timeline-ruler-tick-label">{tick.label}</div>
              )}
            </div>
          ))}

          {/* Playhead */}
          <div
            className="timeline-ruler-playhead"
            style={{ left: currentFrame * pixelsPerFrame }}
          >
            <div className="timeline-ruler-playhead-handle" />
          </div>
        </div>
      </div>
    </div>
  );
}
