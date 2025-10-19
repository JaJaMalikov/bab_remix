import { memo, useCallback } from "react";

import { useUi } from "../context/UiContext";
import type { UiState } from "../context/UiContext";

// Define the props for the component, using the type from UiState
interface LayerItemProps {
  item: UiState["sceneItems"][0];
}

/**
 * A memoized component representing a single item in the Layers panel.
 * It uses useCallback for its event handlers to prevent unnecessary re-renders.
 */
export const LayerItem = memo(({ item }: LayerItemProps) => {
  const {
    bringForward,
    sendBackward,
    setSelectedItemId,
    setSelectedPuppet,
    setSelectedLimb,
    setAngle,
    setShowInspector,
    setShowLayers,
    setShowLibrary,
  } = useUi();

  // Memoize the callbacks to prevent re-creation
  const handleSendBackward = useCallback(() => {
    sendBackward(item.id);
  }, [sendBackward, item.id]);

  const handleBringForward = useCallback(() => {
    bringForward(item.id);
  }, [bringForward, item.id]);

  const handleSelect = useCallback(() => {
    setSelectedItemId(item.id);
    setSelectedLimb("");
    setAngle(0);
    if (item.type === "puppet") {
      const puppetRoot = item.el.firstChild as SVGGElement | null;
      setSelectedPuppet(puppetRoot);
    } else {
      setSelectedPuppet(null);
    }
    setShowInspector(true);
    setShowLayers(false);
    setShowLibrary(false);
    window.dispatchEvent(
      new CustomEvent("item:transformed", {
        detail: { id: item.id, final: false },
      }),
    );
  }, [
    item.el,
    item.id,
    item.type,
    setAngle,
    setSelectedItemId,
    setSelectedLimb,
    setSelectedPuppet,
    setShowInspector,
    setShowLayers,
    setShowLibrary,
  ]);

  return (
    <div className="flex items-center gap-2 rounded border border-border bg-muted/40 px-2 py-1.5 text-xs text-foreground">
      <span className="flex-1 truncate" title={item.label}>
        {item.label}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={handleSendBackward}
          title="Send backward"
        >
          ↓
        </button>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={handleBringForward}
          title="Bring forward"
        >
          ↑
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={handleSelect}
          title="Select in Inspector"
        >
          Select
        </button>
      </div>
    </div>
  );
});
