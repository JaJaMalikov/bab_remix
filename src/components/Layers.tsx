import { memo } from "react";
import { useUi } from "../context/UiContext";
import { LayerItem } from "./LayerItem";

export const Layers = memo(() => {
  const { sceneItems } = useUi();

  return (
    <div className="flex h-full flex-col gap-2">
      {sceneItems.length === 0 && (
        <div className="rounded border border-dashed border-border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
          Pas d'objet sur la scene
        </div>
      )}
      {sceneItems.map((item) => (
        <LayerItem key={item.id} item={item} />
      ))}
    </div>
  );
});
