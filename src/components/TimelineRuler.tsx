import React, { useRef } from "react";
import { cn } from "../lib/utils";

interface TimelineRulerProps {
  /** La durée totale de l'animation en frames. */
  duration: number;
  /** La frame actuellement affichée. */
  currentFrame: number;
  /** Le niveau de zoom de la timeline. */
  zoom: number;
  /** Callback appelé lorsque l'utilisateur clique ou glisse sur la règle pour changer de frame. */
  onSeek: (frame: number) => void;
  /** Callback optionnel appelé lorsque l'utilisateur zoome avec la molette de la souris. */
  onZoom?: (delta: number) => void;
}

export function TimelineRuler({
  duration,
  currentFrame,
  zoom,
  onSeek,
  onZoom,
}: TimelineRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);

  const pixelsPerFrame = 2 * zoom;
  const totalWidth = duration * pixelsPerFrame;

  // Generate tick marks based on frames
  const generateTicks = () => {
    const ticks = [];

    // Determine interval based on zoom
    let frameInterval;
    if (zoom < 0.5) {
      frameInterval = 60;
    } else if (zoom < 1) {
      frameInterval = 30;
    } else if (zoom < 2) {
      frameInterval = 12;
    } else {
      frameInterval = 6;
    }

    for (let frame = 0; frame <= duration; frame += frameInterval) {
      const isMajor = frame % 30 === 0; // Major tick every 30 frames
      ticks.push({
        frame,
        position: frame * pixelsPerFrame,
        isMajor,
        label: isMajor ? frame.toString() : null,
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
      <div className="timeline-ruler-spacer">Frame</div>

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
                  tick.isMajor ? "major" : "minor"
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
