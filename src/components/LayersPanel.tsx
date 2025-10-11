import { memo } from "react";
import { useUi } from "../context/UiContext";
import { LayerItem } from "./LayerItem";

export const LayersPanel = memo(() => {
  const { sceneItems } = useUi();

  return (
    <div className="layers-panel">
      <div className="panel-section-header">
        <h4>Scene Layers</h4>
        <span className="item-count">{sceneItems.length}</span>
      </div>
      <div className="layers-list">
        {sceneItems.length === 0 && (
          <div className="empty-state">No items in scene</div>
        )}
        {sceneItems.map((item) => (
          <LayerItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
});
