import React, { useEffect, useRef } from "react";
import { useUi } from "../context/UiContext";

export const Timeline: React.FC = () => {
  const { angle, setAngle, playing, setPlaying, selectedLimb } = useUi();
  const rafRef = useRef<number | null>(null);

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

  return (
    <div className="timeline" style={{ position: "relative" }}>
      <div className="timeline-header">
        <div className="timeline-controls">
          <button onClick={() => setPlaying(!playing)} disabled={!selectedLimb}>
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={() => { setPlaying(false); setAngle(0); }}>
            ⏹ Stop
          </button>
          <span className="frame-counter">Angle: {Math.round(angle)}°</span>
        </div>
      </div>
      <div className="timeline-content">
        <div className="timeline-tracks">
          <div className="track">
            <div className="track-label">{selectedLimb || "(no limb)"}</div>
            <div className="track-keyframes" />
          </div>
        </div>
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
};

