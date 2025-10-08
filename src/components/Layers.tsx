import { memo } from "react";
import { FloatingPanel } from "./FloatingPanel";
import { useUi } from "../context/UiContext";
import { LayerItem } from "./LayerItem";

export const Layers = memo(() => {
  const { sceneItems } = useUi();

  return (
    <FloatingPanel title="Layers" initialPosition={{ x: 20, y: 20 }} width={240} height={300} storageKey="pos:panel:layers">
      <div className="layers-content" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sceneItems.length === 0 && <div style={{ color: '#999' }}>No items in scene</div>}
        {sceneItems.map((item) => (
          <LayerItem key={item.id} item={item} />
        ))}
      </div>
    </FloatingPanel>
  );
});
