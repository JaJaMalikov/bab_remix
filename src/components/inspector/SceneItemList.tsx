import React from "react";
import type { SceneItem } from "../../context/UiContext";

interface SceneItemListProps {
  items: SceneItem[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  onDeselectAll: () => void;
}

export const SceneItemList: React.FC<SceneItemListProps> = ({
  items,
  selectedId,
  onSelectItem,
  onDeselectAll,
}) => {
  return (
    <div className="property-group">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>Scene Items ({items.length})</h4>
        {selectedId && (
          <button
            onClick={onDeselectAll}
            style={{
              padding: "4px 8px",
              background: "#3a3a3a",
              border: "1px solid #5a5a5a",
              borderRadius: 4,
              color: "#e0e0e0",
              cursor: "pointer",
              fontSize: 10,
            }}
          >
            Deselect
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto" }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectItem(item.id)}
            style={{
              padding: "6px 8px",
              background: item.id === selectedId ? "#5a9fd4" : "#1e1e1e",
              border: "1px solid #3a3a3a",
              borderRadius: 4,
              color: item.id === selectedId ? "#fff" : "#e0e0e0",
              cursor: "pointer",
              textAlign: "left",
              fontSize: 12,
            }}
          >
            {item.type === "puppet" ? "🎭" : "🖼️"} {item.label}
          </button>
        ))}
        {items.length === 0 && (
          <div style={{ color: "#808080", fontSize: 12, padding: 8 }}>No items in scene</div>
        )}
      </div>
    </div>
  );
};
