import { Input } from "../ui/input";
import React, { useState, useCallback, useEffect } from "react";
import type { SceneItem } from "../../context/UiContext";
import { useUi } from "../../context/UiContext";

interface ItemPropertiesProps {
  /** L'élément de la scène actuellement sélectionné. */
  item: SceneItem;
}

export const ItemProperties: React.FC<ItemPropertiesProps> = ({ item }) => {
  const { updateSceneItemLabel } = useUi();
  const [isEditing, setIsEditing] = useState(false);
  const [labelInput, setLabelInput] = useState(item.label);

  useEffect(() => {
    setLabelInput(item.label);
    setIsEditing(false);
  }, [item]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSaveLabel = useCallback(() => {
    if (labelInput.trim()) {
      updateSceneItemLabel(item.id, labelInput.trim());
    }
    setIsEditing(false);
  }, [item.id, labelInput, updateSceneItemLabel]);

  return (
    <div className="flex items-center gap-2 rounded border border-border bg-muted/30 p-2">
      <span className="text-[10px] font-medium uppercase text-muted-foreground">
        Name
      </span>
      {isEditing ? (
        <div className="flex flex-1 items-center gap-1">
          <Input
            type="text"
            value={labelInput}
            onChange={(event) => setLabelInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSaveLabel()}
            autoFocus
            className="h-6 flex-1 text-xs"
          />
          <button
            type="button"
            onClick={handleSaveLabel}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-primary text-xs text-primary-foreground hover:bg-primary/90"
          >
            ✓
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStartEdit}
          className="flex-1 text-left text-xs font-medium text-foreground underline decoration-dotted underline-offset-2"
        >
          {item.label}
        </button>
      )}
    </div>
  );
};
