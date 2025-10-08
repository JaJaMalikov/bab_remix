import { FloatingPanel } from "./FloatingPanel";
import { useUi } from "../context/UiContext";

export const PlaybackMini = () => {
  const { playing, setPlaying, selectedLimb, setAngle } = useUi();
  return (
    <FloatingPanel title="Playback" initialPosition={{ x: 20, y: window.innerHeight - 160 }} width={200} height={100} storageKey="pos:panel:playback">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setPlaying(!playing)} disabled={!selectedLimb}>{playing ? '⏸ Pause' : '▶ Play'}</button>
        <button onClick={() => { setPlaying(false); setAngle(0); }}>⏹ Stop</button>
      </div>
    </FloatingPanel>
  );
};
