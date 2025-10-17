import { memo, useCallback } from "react";
import type { DragEvent } from "react";

import { useUi } from "../context/UiContext";

export interface Asset {
  name: string;
  type: "pantin" | "objet" | "decor";
  path: string;
}

interface AssetItemProps {
  asset: Asset;
}

export const AssetItem = memo(({ asset }: AssetItemProps) => {
  const { importAsset } = useUi();

  const handleDragStart = useCallback(
    (event: DragEvent) => {
      event.dataTransfer.setData("application/json", JSON.stringify(asset));
      event.dataTransfer.effectAllowed = "copy";
    },
    [asset],
  );

  const handleDoubleClick = useCallback(() => {
    importAsset?.(asset);
  }, [importAsset, asset]);

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
      className="group flex cursor-grab flex-col gap-2 rounded-lg border border-transparent bg-muted/40 p-3 text-left transition hover:border-primary/60 hover:bg-muted/60 active:cursor-grabbing"
    >
      <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-background/60">
        <img
          src={asset.path}
          alt={asset.name}
          className="h-full w-full object-contain p-2 text-muted-foreground"
        />
      </div>
      <div>
        <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {asset.type}
        </p>
      </div>
    </button>
  );
});
