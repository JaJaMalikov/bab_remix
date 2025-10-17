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
      className="flex cursor-grab flex-col gap-1 rounded border border-transparent bg-muted/40 p-2 text-left transition hover:border-primary/60 hover:bg-muted/60 active:cursor-grabbing"
    >
      <div className="aspect-square overflow-hidden rounded border border-border bg-background/60">
        <img
          src={asset.path}
          alt={asset.name}
          className="h-full w-full object-contain p-1"
        />
      </div>
      <p className="truncate text-[11px] font-medium text-foreground">
        {asset.name}
      </p>
    </button>
  );
});
