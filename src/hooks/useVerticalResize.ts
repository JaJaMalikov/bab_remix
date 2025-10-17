import { useState, useCallback, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useWindowDrag } from "./useWindowDrag";

interface VerticalResizeArgs {
  height: number;
  setHeight: (height: number) => void;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * A hook to manage vertical resizing of a component.
 * It encapsulates the event listener logic for dragging a resizer element,
 * but uses the height state and setter passed in from its parent component.
 */
export const useVerticalResize = ({
  height,
  setHeight,
  minHeight = 120,
  maxHeight,
}: VerticalResizeArgs) => {
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ startY: number; startH: number } | null>(
    null,
  );

  const onResizeMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = {
        startY: e.clientY,
        startH: height,
      };
    },
    [height],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const dy = resizeStartRef.current.startY - e.clientY;
      const newHeight = Math.max(minHeight, resizeStartRef.current.startH + dy);

      // Apply maxHeight if it's provided
      setHeight(maxHeight ? Math.min(maxHeight, newHeight) : newHeight);
    },
    [setHeight, minHeight, maxHeight],
  );

  const handleMouseUp = useCallback((_event: MouseEvent) => {
    setIsResizing(false);
    resizeStartRef.current = null;
  }, []);

  useWindowDrag(isResizing, handleMouseMove, handleMouseUp);

  return {
    onResizeMouseDown,
    isResizing,
  };
};
