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
  const handleAddKeyframe = useCallback(() => {
    if (!selectedLimb) return;
    addKeyframe(selectedLimb, currentFrame, angle);
  }, [selectedLimb, currentFrame, angle, addKeyframe]);
  const handleRemoveKeyframe = useCallback(() => {
    if (!selectedLimb) return;
    removeKeyframe(selectedLimb, currentFrame);
  }, [selectedLimb, currentFrame, removeKeyframe]);

  const keyframesForSelected = useMemo(() => keyframes[selectedLimb] ?? [], [keyframes, selectedLimb]);
  const hasKeyframeAtCurrent = useMemo(
    () => keyframesForSelected.some((kf) => kf.frame === currentFrame),
    [keyframesForSelected, currentFrame],
  );

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
          <button style={{ marginLeft: 'auto' }} onClick={handleToggleTracks}>
            {showTracks ? 'Hide Tracks' : 'Show Tracks'}
          </button>
          <button onClick={handleAddKeyframe} disabled={!selectedLimb}>
            ➕ Keyframe
          </button>
          <button onClick={handleRemoveKeyframe} disabled={!selectedLimb || !hasKeyframeAtCurrent}>
            ✖ Keyframe
          </button>
        </div>
      </div>
      <div className="timeline-content">
        {showTracks && (
          <div className="timeline-tracks">
            <div className="track">
              <div className="track-label">{selectedLimb || "(no limb)"}</div>
              <div className="track-keyframes">
                {keyframesForSelected.map((kf) => (
                  <div
                    key={kf.frame}
                    className={`keyframe-marker${kf.frame === currentFrame ? " active" : ""}`}
                    style={{ left: `${(kf.frame / Math.max(1, totalFrames - 1)) * 100}%` }}
                    onClick={() => setCurrentFrame(kf.frame)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
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
      </div>
    </div>
  );
});
