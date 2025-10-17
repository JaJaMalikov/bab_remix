import { memo } from "react";
import { useUi } from "../context/UiContext";
import { LayerItem } from "./LayerItem";

export const Layers = memo(() => {
  const { sceneItems } = useUi();

  return (
    <div className="flex flex-col gap-3">
      <header className="text-sm font-semibold text-foreground">
        Layers
      </header>
      <div className="flex flex-col gap-2">
        {sceneItems.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
            No items in scene
          </div>
        )}
        {sceneItems.map((item) => (
          <LayerItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
});
