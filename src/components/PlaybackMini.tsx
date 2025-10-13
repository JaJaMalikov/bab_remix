import { memo, useCallback } from "react";
import { FloatingPanel } from "./FloatingPanel";
import { useAnimation } from "../context/AnimationContext";

export const PlaybackMini = memo(() => {
  const { playing, setPlaying, currentFrame, setCurrentFrame } = useAnimation();

  const handleTogglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, [setPlaying]);

  const handleStop = useCallback(() => {
    setPlaying(false);
    setCurrentFrame(0);
  }, [setPlaying, setCurrentFrame]);

  return (
    <FloatingPanel title="Playback" initialPosition={{ x: 20, y: window.innerHeight - 160 }} width={200} height={100} storageKey="pos:panel:playback">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={handleTogglePlay} aria-label={playing ? "Mettre en pause" : "Lancer la lecture"}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <button type="button" onClick={handleStop} aria-label="Arrêter la lecture">
          ⏹ Stop
        </button>
        <div style={{ marginLeft: 8, fontSize: '12px' }}>Frame: {currentFrame}</div>
      </div>
    </FloatingPanel>
  );
});
