import { Button } from "../ui/button";
import { Input } from "../ui/input";
import React, { useState, useCallback, useEffect } from "react";
import type { SceneItem } from "../../context/UiContext";
import { useUi } from "../../context/UiContext";

interface ItemPropertiesProps {
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
    <section className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-foreground">Properties</h4>
      <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Type
        </span>
        <span className="text-sm font-medium text-foreground">
          {item.type === "puppet"
            ? "Puppet"
            : item.el instanceof SVGImageElement
              ? "Image"
              : "Object"}
        </span>
      </div>
      <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Name
        </span>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSaveLabel()}
              autoFocus
            />
            <Button type="button" size="sm" onClick={handleSaveLabel}>
              ✓
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartEdit}
            className="self-start text-sm font-medium text-foreground underline decoration-dotted underline-offset-4"
          >
            {item.label}
          </button>
        )}
      </div>
    </section>
  );
};
