import { memo, useCallback } from "react";

import { Button } from "./ui/button";
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
  const { bringForward, sendBackward, setSelectedPuppet } = useUi();

  // Memoize the callbacks to prevent re-creation
  const handleSendBackward = useCallback(() => {
    sendBackward(item.id);
  }, [sendBackward, item.id]);

  const handleBringForward = useCallback(() => {
    bringForward(item.id);
  }, [bringForward, item.id]);

  const handleSelect = useCallback(() => {
    if (item.el instanceof SVGGElement) {
      setSelectedPuppet(item.el);
    }
  }, [setSelectedPuppet, item.el]);

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
      <span className="flex-1 truncate" title={item.label}>
        {item.label}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleSendBackward}
          title="Send backward"
        >
          ↓
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleBringForward}
          title="Bring forward"
        >
          ↑
        </Button>
        {item.el instanceof SVGGElement && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSelect}
          >
            Select
          </Button>
        )}
      </div>
    </div>
  );
});
