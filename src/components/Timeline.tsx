import React, { useEffect, useRef, useCallback, useState } from "react";
import { useUi } from "../context/UiContext";

export const Timeline: React.FC = React.memo(() => {
  const { angle, setAngle, playing, setPlaying, selectedLimb, showTracks, setShowTracks, timelineHeight, setTimelineHeight } = useUi();
  const rafRef = useRef<number | null>(null);
  const resizingRef = useRef<null | { startY: number; startH: number }>(null);
  const [isResizing, setIsResizing] = useState(false);

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

  const onResizeDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    resizingRef.current = { startY: e.clientY, startH: timelineHeight };
    e.preventDefault();
    e.stopPropagation();
  }, [timelineHeight]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const dy = resizingRef.current.startY - e.clientY;
      const nh = Math.min(Math.max(120, resizingRef.current.startH + dy), Math.round(window.innerHeight * 0.6));
      setTimelineHeight(nh);
    };
    const onUp = () => {
      resizingRef.current = null;
      setIsResizing(false);
    };
    if (isResizing) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
    }
  }, [isResizing, setTimelineHeight]);

  return (
    <div className="timeline" style={{ position: "relative", height: timelineHeight }}>
      <div className="timeline-resizer" onMouseDown={onResizeDown} title="Drag to resize" />
      <div className="timeline-header">
        <div className="timeline-controls">
          <button onClick={() => setPlaying(!playing)} disabled={!selectedLimb}>
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={() => { setPlaying(false); setAngle(0); }}>
            ⏹ Stop
          </button>
          <span className="frame-counter">Angle: {Math.round(angle)}°</span>
          <button style={{ marginLeft: 'auto' }} onClick={() => setShowTracks(!showTracks)}>
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
            onChange={(e) => setAngle(parseFloat(e.target.value))}
            className="scrubber"
          />
        </div>
      </div>
    </div>
  );
});
