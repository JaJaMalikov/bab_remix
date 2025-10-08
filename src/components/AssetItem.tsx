import { memo, useCallback } from 'react';
import type { DragEvent } from 'react';
import { useUi } from '../context/UiContext';

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

  const handleDragStart = useCallback((e: DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify(asset));
    e.dataTransfer.effectAllowed = "copy";
  }, [asset]);

  const handleDoubleClick = useCallback(() => {
    importAsset?.(asset);
  }, [importAsset, asset]);

  return (
    <div
      className="asset-item"
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
    >
      <div className="asset-preview">
        <img src={asset.path} alt={asset.name} />
      </div>
      <div className="asset-name">{asset.name}</div>
      <div className="asset-type">{asset.type}</div>
    </div>
  );
});
