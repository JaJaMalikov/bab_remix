import React, { useEffect, useRef, useCallback } from "react";
import { useUi } from "../context/UiContext";
import { useVerticalResize } from "../hooks/useVerticalResize";

export const Timeline: React.FC = React.memo(() => {
  const { angle, setAngle, playing, setPlaying, selectedLimb, showTracks, setShowTracks, timelineHeight, setTimelineHeight } = useUi();
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
    const loop = (t: number) => {
      // simple oscillation between -60 and +60 over 2s
      const dt = (t - start) / 1000;
      const a = Math.sin(dt * Math.PI) * 60;
      setAngle(a);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, setAngle]);

  // Memoized event handlers
  const handleTogglePlay = useCallback(() => setPlaying(!playing), [playing, setPlaying]);
  const handleStop = useCallback(() => {
    setPlaying(false);
    setAngle(0);
  }, [setPlaying, setAngle]);
  const handleToggleTracks = useCallback(() => setShowTracks(!showTracks), [showTracks, setShowTracks]);
  const handleScrubberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAngle(parseFloat(e.target.value));
  }, [setAngle]);

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
          <span className="frame-counter">Angle: {Math.round(angle)}°</span>
          <button style={{ marginLeft: 'auto' }} onClick={handleToggleTracks}>
            {showTracks ? 'Hide Tracks' : 'Show Tracks'}
          </button>
        </div>
      </div>
      <div className="timeline-content">
        {showTracks && (
          <div className="timeline-tracks">
            <div className="track">
              <div className="track-label">{selectedLimb || "(no limb)"}</div>
              <div className="track-keyframes" />
            </div>
          </div>
        )}
        <div className="timeline-scrubber">
          <input
            type="range"
            min={-180}
            max={180}
            value={angle}
            onChange={handleScrubberChange}
            className="scrubber"
          />
        </div>
      </div>
    </div>
  );
});
