import React, { useState, useCallback, useRef, useEffect } from "react";
import { readFromLocalStorage, writeToLocalStorage } from "./useLocalStorage";
import { useWindowDrag } from "./useWindowDrag";

export interface Position {
  x: number;
  y: number;
}

interface Options {
  storageKey?: string;
  panelWidth?: number;
  panelHeight?: number;
};

/**
 * A hook to make a component draggable.
 * This refactored version ensures that callbacks are stable and not recreated on every drag movement,
 * improving performance and following best practices.
 */
export const useDraggable = (
  initialPosition: Position,
  options: Options = {},
) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  // Use a ref to store the latest position. This allows callbacks to access the latest
  // position without needing `position` in their dependency array, making them stable.
  const positionRef = useRef(position);
  positionRef.current = position;

  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const { storageKey } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Load position from storage on mount or when storageKey changes.
  useEffect(() => {
    if (!storageKey) return;
    const p = readFromLocalStorage(storageKey, initialPosition);
    if (typeof p?.x === "number" && typeof p?.y === "number") {
      setPosition(p);
    }
  }, [storageKey, initialPosition]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start dragging if the drag-handle is the target
      if ((e.target as HTMLElement).closest(".drag-handle")) {
        setIsDragging(true);
        dragStartPos.current = {
          x: e.clientX - positionRef.current.x,
          y: e.clientY - positionRef.current.y,
        };
      }
    },
    [], // Now stable, no dependencies
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragStartPos.current) {
      let x = e.clientX - dragStartPos.current.x;
      let y = e.clientY - dragStartPos.current.y;

      // Edge snapping with 20px threshold
      const snapThreshold = 20;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const panelW = optionsRef.current.panelWidth ?? 300;
      const panelH = optionsRef.current.panelHeight ?? 400;

      // Snap to left edge
      if (x < snapThreshold && x > -snapThreshold) {
        x = 0;
      }

      // Snap to top edge
      if (y < snapThreshold && y > -snapThreshold) {
        y = 0;
      }

      // Snap to right edge
      if (
        x + panelW > windowWidth - snapThreshold &&
        x + panelW < windowWidth + snapThreshold
      ) {
        x = windowWidth - panelW;
      }

      // Snap to bottom edge
      if (
        y + panelH > windowHeight - snapThreshold &&
        y + panelH < windowHeight + snapThreshold
      ) {
        y = windowHeight - panelH;
      }

      setPosition({ x, y });
    }
  }, []); // Now stable, no dependencies

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartPos.current = null;
    if (storageKey) {
      writeToLocalStorage(storageKey, positionRef.current);
    }
  }, [storageKey]); // Now only depends on storageKey

  // Use useWindowDrag hook to manage window event listeners
  useWindowDrag(isDragging, handleMouseMove, handleMouseUp);

  return {
    position,
    handleMouseDown,
    isDragging,
  };
};
