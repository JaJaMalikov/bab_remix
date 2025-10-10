import { memo, useCallback } from "react";
import { FloatingPanel } from "./FloatingPanel";
import { useAnimation } from "../context/AnimationContext";

export const PlaybackMini = memo(() => {
  const { playing, setPlaying } = useAnimation();
  const { currentFrame, setCurrentFrame } = useAnimation();

  const handleTogglePlay = useCallback(() => {
    setPlaying(!playing);
  }, [playing, setPlaying]);

  const handleStop = useCallback(() => {
    setPlaying(false);
    setCurrentFrame(0);
  }, [setPlaying, setCurrentFrame]);

  return (
    <FloatingPanel title="Playback" initialPosition={{ x: 20, y: window.innerHeight - 160 }} width={200} height={100} storageKey="pos:panel:playback">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={handleTogglePlay}>{playing ? '⏸ Pause' : '▶ Play'}</button>
        <button onClick={handleStop}>⏹ Stop</button>
        <div style={{ marginLeft: 8, fontSize: '12px' }}>Frame: {currentFrame}</div>
      </div>
    </FloatingPanel>
  );
});
