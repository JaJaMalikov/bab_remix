import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { useUi } from "../context/UiContext";
import { useVerticalResize } from "../hooks/useVerticalResize";

export const Timeline: React.FC = React.memo(() => {
  const {
    angle,
    setAngle,
    playing,
    setPlaying,
    selectedLimb,
    showTracks,
    setShowTracks,
    timelineHeight,
    setTimelineHeight,
    keyframes,
    addKeyframe,
    updateKeyframe,
    removeKeyframe,
    currentFrame,
    setCurrentFrame,
    totalFrames,
  } = useUi();
  const rafRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isScrubbingRef = useRef(false);

  // Use the custom hook for resizing logic
  const { onResizeMouseDown } = useVerticalResize({
    height: timelineHeight,
    setHeight: setTimelineHeight,
    maxHeight: Math.round(window.innerHeight * 0.6),
  });

  // Playback animation loop
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const start = performance.now();
    const initialFrame = currentFrame;
    const fps = 24;
    let lastFrame = initialFrame;
    const loop = (t: number) => {
      const dt = (t - start) / 1000;
      const advance = Math.floor(dt * fps);
      const nextFrame = (initialFrame + advance) % totalFrames;
      if (nextFrame !== lastFrame) {
        lastFrame = nextFrame;
        setCurrentFrame(nextFrame);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, setCurrentFrame, currentFrame, totalFrames]);

  // Memoized event handlers
  const handleTogglePlay = useCallback(() => setPlaying(!playing), [playing, setPlaying]);
  const handleStop = useCallback(() => {
    setPlaying(false);
    setCurrentFrame(0);
    setAngle(0);
  }, [setPlaying, setCurrentFrame, setAngle]);
  const handleToggleTracks = useCallback(() => setShowTracks(!showTracks), [showTracks, setShowTracks]);
  const handleAngleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!Number.isFinite(value)) return;
      setAngle(value);
      if (selectedLimb && keyframes[selectedLimb]?.some((k) => k.frame === currentFrame)) {
        updateKeyframe(selectedLimb, currentFrame, value);
      }
    },
    [setAngle, selectedLimb, keyframes, currentFrame, updateKeyframe],
  );
  const handleFrameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (!Number.isFinite(value)) return;
      const clamped = Math.max(0, Math.min(totalFrames - 1, Math.round(value)));
      setCurrentFrame(clamped);
    },
    [setCurrentFrame, totalFrames],
  );
  const handleFrameNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (!Number.isFinite(value)) return;
      const clamped = Math.max(0, Math.min(totalFrames - 1, Math.round(value)));
      setCurrentFrame(clamped);
    },
    [setCurrentFrame, totalFrames],
  );
  const handleAddKeyframe = useCallback(() => {
    if (!selectedLimb) return;
    addKeyframe(selectedLimb, currentFrame, angle);
  }, [selectedLimb, currentFrame, angle, addKeyframe]);
  const handleRemoveKeyframe = useCallback(() => {
    if (!selectedLimb) return;
    removeKeyframe(selectedLimb, currentFrame);
  }, [selectedLimb, currentFrame, removeKeyframe]);

  const handleAngleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (!Number.isFinite(value)) return;
      setAngle(value);
      if (selectedLimb && keyframes[selectedLimb]?.some((k) => k.frame === currentFrame)) {
        updateKeyframe(selectedLimb, currentFrame, value);
      }
    },
    [setAngle, selectedLimb, keyframes, currentFrame, updateKeyframe],
  );

  const keyframesForSelected = useMemo(() => keyframes[selectedLimb] ?? [], [keyframes, selectedLimb]);
  const sortedKeyframes = useMemo(
    () => [...keyframesForSelected].sort((a, b) => a.frame - b.frame),
    [keyframesForSelected],
  );
  const hasKeyframeAtCurrent = useMemo(
    () => sortedKeyframes.some((kf) => kf.frame === currentFrame),
    [sortedKeyframes, currentFrame],
  );

  const previousKeyframe = useMemo(() => {
    let previous = null;
    for (const kf of sortedKeyframes) {
      if (kf.frame < currentFrame) previous = kf;
      if (kf.frame >= currentFrame) break;
    }
    return previous;
  }, [sortedKeyframes, currentFrame]);

  const nextKeyframe = useMemo(() => {
    for (const kf of sortedKeyframes) {
      if (kf.frame > currentFrame) return kf;
    }
    return null;
  }, [sortedKeyframes, currentFrame]);

  const handleJumpToKeyframe = useCallback(
    (direction: "prev" | "next") => {
      const target = direction === "prev" ? previousKeyframe : nextKeyframe;
      if (!target) return;
      setCurrentFrame(target.frame);
      setAngle(target.value);
    },
    [nextKeyframe, previousKeyframe, setCurrentFrame, setAngle],
  );

  const maxFrameIndex = Math.max(1, totalFrames - 1);

  const frameFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return currentFrame;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return currentFrame;
      const ratio = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, ratio));
      return Math.round(clamped * maxFrameIndex);
    },
    [currentFrame, maxFrameIndex],
  );

  const scrubToClientX = useCallback(
    (clientX: number) => {
      const frame = frameFromClientX(clientX);
      setCurrentFrame(frame);
      return frame;
    },
    [frameFromClientX, setCurrentFrame],
  );

  const handleTrackPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
      isScrubbingRef.current = true;
      setPlaying(false);
      scrubToClientX(event.clientX);
    },
    [scrubToClientX, setPlaying],
  );

  const handleTrackPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isScrubbingRef.current) return;
      scrubToClientX(event.clientX);
    },
    [scrubToClientX],
  );

  const handleTrackPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)) {
      (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
    }
    isScrubbingRef.current = false;
  }, []);

  const handleTrackDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedLimb) return;
      const frame = scrubToClientX(event.clientX);
      addKeyframe(selectedLimb, frame, angle);
    },
    [selectedLimb, scrubToClientX, addKeyframe, angle],
  );

  const timelineTicks = useMemo(() => {
    const interval = totalFrames <= 120 ? 10 : totalFrames <= 360 ? 20 : 50;
    const ticks: number[] = [];
    for (let frame = 0; frame <= maxFrameIndex; frame += interval) {
      ticks.push(frame);
    }
    if (ticks[ticks.length - 1] !== maxFrameIndex) {
      ticks.push(maxFrameIndex);
    }
    return ticks;
  }, [totalFrames, maxFrameIndex]);

  return (
    <div className="timeline" style={{ position: "relative", height: timelineHeight }}>
      <div className="timeline-resizer" onMouseDown={onResizeMouseDown} title="Drag to resize" />
      <div className="timeline-header">
        <div className="timeline-controls">
          <button onClick={handleTogglePlay} disabled={!selectedLimb}>
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={handleStop}>
            ⏹ Stop
          </button>
          <span className="frame-counter">
            Frame: {currentFrame}/{totalFrames - 1} · Angle: {Math.round(angle)}°
          </span>
          <div className="timeline-controls__spacer" />
          <button onClick={() => handleJumpToKeyframe("prev")} disabled={!previousKeyframe} title="Keyframe précédent">
            ⏮
          </button>
          <button onClick={() => handleJumpToKeyframe("next")} disabled={!nextKeyframe} title="Keyframe suivant">
            ⏭
          </button>
          <button onClick={handleAddKeyframe} disabled={!selectedLimb} title="Ajouter un keyframe">
            ➕
          </button>
          <button
            onClick={handleRemoveKeyframe}
            disabled={!selectedLimb || !hasKeyframeAtCurrent}
            title="Supprimer le keyframe courant"
          >
            ✖
          </button>
          <button style={{ marginLeft: 4 }} onClick={handleToggleTracks}>
            {showTracks ? "Masquer la liste" : "Afficher la liste"}
          </button>
        </div>
      </div>
      <div className="timeline-content">
        <div className="timeline-scale">
          {timelineTicks.map((tick) => (
            <div
              key={tick}
              className="timeline-tick"
              style={{ left: `${(tick / maxFrameIndex) * 100}%` }}
            >
              <span>{tick}</span>
            </div>
          ))}
        </div>
        <div className="timeline-track-wrapper">
          <div
            className="timeline-track"
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={handleTrackPointerMove}
            onPointerUp={handleTrackPointerUp}
            onPointerLeave={handleTrackPointerUp}
            onDoubleClick={handleTrackDoubleClick}
            role="presentation"
            tabIndex={-1}
          >
            <div
              className="timeline-playhead"
              style={{ left: `${(currentFrame / maxFrameIndex) * 100}%` }}
            />
            {sortedKeyframes.map((kf) => (
              <div
                key={kf.frame}
                className={`keyframe-marker${kf.frame === currentFrame ? " active" : ""}`}
                style={{ left: `${(kf.frame / maxFrameIndex) * 100}%` }}
                onClick={() => setCurrentFrame(kf.frame)}
              />
            ))}
          </div>
        </div>
        <div className="timeline-precision-controls">
          <label>Frame</label>
          <input
            type="number"
            min={0}
            max={totalFrames - 1}
            value={currentFrame}
            onChange={handleFrameNumberChange}
          />
          <label>Angle</label>
          <input
            type="number"
            min={-180}
            max={180}
            step={0.1}
            value={angle}
            onChange={handleAngleNumberChange}
          />
        </div>
        <div className="timeline-scrubber">
          <label>Frame</label>
          <input
            type="range"
            min={0}
            max={totalFrames - 1}
            value={currentFrame}
            onChange={handleFrameChange}
            className="scrubber"
          />
          <label>Angle</label>
          <input
            type="range"
            min={-180}
            max={180}
            value={angle}
            onChange={handleAngleChange}
            className="scrubber"
          />
        </div>
        {showTracks && (
          <div className="timeline-keyframe-list">
            <div className="timeline-keyframe-list__header">
              <span>Frame</span>
              <span>Angle</span>
            </div>
            {sortedKeyframes.length === 0 && (
              <div className="timeline-keyframe-list__row timeline-keyframe-list__row--empty">
                Aucun keyframe pour ce membre.
              </div>
            )}
            {sortedKeyframes.map((kf) => (
              <div
                key={`row-${kf.frame}`}
                className={`timeline-keyframe-list__row${kf.frame === currentFrame ? " is-active" : ""}`}
                onClick={() => setCurrentFrame(kf.frame)}
              >
                <span>{kf.frame}</span>
                <span>{Math.round(kf.value)}°</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
