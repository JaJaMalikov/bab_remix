import { memo, useCallback } from "react";
import { FloatingPanel } from "./FloatingPanel";
import { useUi } from "../context/UiContext";

export const PlaybackMini = memo(() => {
  const { playing, setPlaying, selectedLimb, setAngle } = useUi();

  const handleTogglePlay = useCallback(() => {
    setPlaying(!playing);
  }, [playing, setPlaying]);

  const handleStop = useCallback(() => {
    setPlaying(false);
    setAngle(0);
  }, [setPlaying, setAngle]);

  return (
    <FloatingPanel title="Playback" initialPosition={{ x: 20, y: window.innerHeight - 160 }} width={200} height={100} storageKey="pos:panel:playback">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={handleTogglePlay} disabled={!selectedLimb}>{playing ? '⏸ Pause' : '▶ Play'}</button>
        <button onClick={handleStop}>⏹ Stop</button>
      </div>
    </FloatingPanel>
  );
});
