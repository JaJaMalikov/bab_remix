import { memo } from "react";
import { FloatingPanel } from "./FloatingPanel";
import { useUi } from "../context/UiContext";

export const Layers = memo(() => {
  const { sceneItems, bringForward, sendBackward, setSelectedPuppet } = useUi();

  return (
    <FloatingPanel title="Layers" initialPosition={{ x: 20, y: 20 }} width={240} height={300} storageKey="pos:panel:layers">
      <div className="layers-content" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sceneItems.length === 0 && <div style={{ color: '#999' }}>No items in scene</div>}
        {sceneItems.map((it) => (
          <div key={it.id} className="layer-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</div>
            <button onClick={() => sendBackward(it.id)} title="Send backward">↓</button>
            <button onClick={() => bringForward(it.id)} title="Bring forward">↑</button>
            {it.el instanceof SVGGElement && (
              <button onClick={() => setSelectedPuppet(it.el as SVGGElement)}>Select</button>
            )}
          </div>
        ))}
      </div>
    </FloatingPanel>
  );
});
