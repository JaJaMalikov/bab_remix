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
      className="group flex cursor-grab flex-col gap-1.5 rounded-lg border border-transparent bg-muted/40 p-3 text-left transition hover:border-primary/60 hover:bg-muted/60 active:cursor-grabbing"
    >
      <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-background/60">
        <img
          src={asset.path}
          alt={asset.name}
          className="h-full w-full object-contain p-1.5 text-muted-foreground"
        />
      </div>
      <div className="space-y-0.5">
        <p className="truncate text-xs font-medium text-foreground">
          {asset.name}
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {asset.type}
        </p>
      </div>
    </button>
  );
});
