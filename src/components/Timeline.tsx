import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "../context/UiContext";
import { useAnimation } from "../context/AnimationContext";
import { useVerticalResize } from "../hooks/useVerticalResize";

const MIN_HEIGHT = 40;
const MAX_HEIGHT = 100;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const extractClientX = (event: MouseEvent | TouchEvent): number | null => {
  if ("touches" in event) {
    const touch = event.touches[0] ?? event.changedTouches?.[0];
    return touch?.clientX ?? null;
  }
  return (event as MouseEvent).clientX ?? null;
};

export const Timeline: React.FC = React.memo(() => {
  const { timelineHeight, setTimelineHeight, sceneItems } = useUi();
  const {
    duration,
    currentFrame,
    setCurrentFrame,
    tracks,
    removeKeyframe,
    playing,
    setPlaying,
    snapshotKeyframes,
  } = useAnimation();

  const { onResizeMouseDown } = useVerticalResize({
    height: timelineHeight,
    setHeight: setTimelineHeight,
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
  });

  const laneRef = useRef<HTMLDivElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const maxFrameIndex = Math.max(duration - 1, 0);
  const frameDivisor = Math.max(maxFrameIndex, 1);

  useEffect(() => {
    if (timelineHeight > MAX_HEIGHT) {
      setTimelineHeight(MAX_HEIGHT);
    }
  }, [setTimelineHeight, timelineHeight]);

  const frameMarkers = useMemo(
    () =>
      Array.from(
        tracks.reduce((acc, track) => {
          track.keyframes.forEach((kf) => {
            acc.set(kf.frame, (acc.get(kf.frame) ?? 0) + 1);
          });
          return acc;
        }, new Map<number, number>())
      )
        .sort((a, b) => a[0] - b[0])
        .map(([frame, count]) => ({ frame, count })),
    [tracks]
  );

  const currentFramePosition = useMemo(() => (currentFrame / frameDivisor) * 100, [currentFrame, frameDivisor]);

  const updateFrameFromClientX = useCallback(
    (clientX: number) => {
      const rect = laneRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relativeX = clamp(clientX - rect.left, 0, rect.width);
      const ratio = rect.width > 0 ? relativeX / rect.width : 0;
      const nextFrame = Math.round(ratio * frameDivisor);
      setCurrentFrame(clamp(nextFrame, 0, frameDivisor));
    },
    [frameDivisor, setCurrentFrame]
  );

  const handleLanePointerDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      event.preventDefault();
      const initialClientX =
        "touches" in event ? event.touches[0]?.clientX ?? null : event.clientX ?? null;
      if (initialClientX == null) return;

      setIsScrubbing(true);
      updateFrameFromClientX(initialClientX);

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        const clientX = extractClientX(moveEvent);
        if (clientX != null) {
          updateFrameFromClientX(clientX);
        }
      };

      const stopScrubbing = () => {
        setIsScrubbing(false);
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("mouseup", stopScrubbing);
        window.removeEventListener("touchend", stopScrubbing);
        window.removeEventListener("touchcancel", stopScrubbing);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("mouseup", stopScrubbing);
      window.addEventListener("touchend", stopScrubbing);
      window.addEventListener("touchcancel", stopScrubbing);
    },
    [updateFrameFromClientX]
  );

  const gotoFrame = useCallback(
    (frame: number) => {
      setCurrentFrame(clamp(frame, 0, frameDivisor));
    },
    [frameDivisor, setCurrentFrame]
  );

  const clearFrameKeyframes = useCallback(
    (frame: number) => {
      tracks.forEach((track) => {
        const hasKeyframe = track.keyframes.some((kf) => kf.frame === frame);
        if (hasKeyframe) {
          removeKeyframe(track.id, frame);
        }
      });
    },
    [removeKeyframe, tracks]
  );

  const tickStep = useMemo(() => {
    if (frameDivisor > 240) return 24;
    if (frameDivisor > 120) return 12;
    if (frameDivisor > 60) return 8;
    if (frameDivisor > 30) return 4;
    return 1;
  }, [frameDivisor]);

  const handleTogglePlay = useCallback(() => {
    setPlaying(!playing);
  }, [setPlaying, playing]);

  const handleStop = useCallback(() => {
    setPlaying(false);
    setCurrentFrame(0);
  }, [setCurrentFrame, setPlaying]);

  return (
    <div className="timeline" style={{ height: timelineHeight }}>
      <div className="timeline-resizer" onMouseDown={onResizeMouseDown} title="Redimensionner la timeline" />
      <div className="timeline-toolbar">
        <div className="timeline-toolbar-left">
          <button
            type="button"
            className="timeline-icon-button"
            title={playing ? "Pause" : "Lecture"}
            onClick={handleTogglePlay}
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            className="timeline-icon-button"
            title="Revenir au début"
            onClick={handleStop}
          >
            ⏹
          </button>
          <button
            type="button"
            className="timeline-icon-button"
            title="Snapshot des éléments à ce frame"
            onClick={() => snapshotKeyframes(sceneItems)}
          >
            📸
          </button>
        </div>
        <div className="timeline-toolbar-right">
          <span className="timeline-readout" title="Frame courant">
            <span className="timeline-readout-label">Frame</span>
            <span className="timeline-readout-value">{currentFrame}</span>
          </span>
          <span className="timeline-readout" title="Durée totale">
            <span className="timeline-readout-label">Durée</span>
            <span className="timeline-readout-value">{duration || 0}</span>
          </span>
        </div>
      </div>
      <div
        className={`timeline-lane${isScrubbing ? " is-scrubbing" : ""}`}
        ref={laneRef}
        onMouseDown={handleLanePointerDown}
        onTouchStart={handleLanePointerDown}
        role="presentation"
      >
        <div className="timeline-lane-background" />
        <div className="timeline-playhead" style={{ left: `${currentFramePosition}%` }} />
        {frameMarkers.map(({ frame, count }) => {
          const left = (frame / frameDivisor) * 100;
          return (
            <button
              key={frame}
              type="button"
              className={`timeline-marker${frame === currentFrame ? " is-active" : ""}`}
              style={{ left: `${left}%` }}
              title={
                count > 1 ? `${count} keyframes au frame ${frame}` : `Keyframe au frame ${frame}`
              }
              onClick={() => gotoFrame(frame)}
              onDoubleClick={() => clearFrameKeyframes(frame)}
            >
              <span className="timeline-marker-stem" />
              <span className="timeline-marker-cap" />
            </button>
          );
        })}
        {frameMarkers.length === 0 && (
          <div className="timeline-lane-empty">Aucune keyframe pour l’instant.</div>
        )}
        <div className="timeline-lane-scale">
          {Array.from({ length: frameDivisor + 1 }, (_, index) => {
            if (index !== 0 && index !== frameDivisor && index % tickStep !== 0) {
              return null;
            }
            const left = (index / frameDivisor) * 100;
            return (
              <div key={index} className="timeline-lane-tick" style={{ left: `${left}%` }}>
                <span className="timeline-lane-tick-line" />
                <span className="timeline-lane-tick-label">{index}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
