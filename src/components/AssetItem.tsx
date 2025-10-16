import { memo, useCallback } from "react";
import type { DragEvent } from "react";
import { useUi } from "../context/UiContext";

// The Asset interface is defined here as it's the shape of this component's prop.
export interface Asset {
  name: string;
  type: "pantin" | "objet" | "decor";
  path: string;
}

interface AssetItemProps {
  asset: Asset;
}

/**
 * A memoized component representing a single item in the Library.
 * It handles its own drag and double-click events.
 */
export const AssetItem = memo(({ asset }: AssetItemProps) => {
  const { importAsset } = useUi();

  const handleDragStart = useCallback(
    (e: DragEvent) => {
      e.dataTransfer.setData("application/json", JSON.stringify(asset));
      e.dataTransfer.effectAllowed = "copy";
    },
    [asset],
  );

  const handleDoubleClick = useCallback(() => {
    importAsset?.(asset);
  }, [importAsset, asset]);

  return (
    <div
      className="group flex cursor-grab flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/50 p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/70 hover:bg-card hover:shadow-md active:cursor-grabbing"
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border/50 bg-background/60 p-2 shadow-inner">
        <img
          src={asset.path}
          alt={asset.name}
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="text-sm font-medium text-foreground">{asset.name}</div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {asset.type}
      </div>
    </div>
  );
});
