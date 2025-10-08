import { useState, useCallback, useRef, useEffect } from "react";

export interface Position {
  x: number;
  y: number;
}

type Options = {
  storageKey?: string;
};

/**
 * A hook to make a component draggable.
 * This refactored version ensures that callbacks are stable and not recreated on every drag movement,
 * improving performance and following best practices.
 */
export const useDraggable = (initialPosition: Position, options: Options = {}) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  // Use a ref to store the latest position. This allows callbacks to access the latest
  // position without needing `position` in their dependency array, making them stable.
  const positionRef = useRef(position);
  positionRef.current = position;

  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const { storageKey } = options;

  // Load position from storage on mount or when storageKey changes.
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw) as Position;
        if (typeof p?.x === 'number' && typeof p?.y === 'number') {
          setPosition(p);
        }
      }
    } catch {}
  }, [storageKey]);

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
    [] // Now stable, no dependencies
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragStartPos.current) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    }
  }, []); // Now stable, no dependencies

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartPos.current = null;
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(positionRef.current));
      } catch {}
    }
  }, [storageKey]); // Now only depends on storageKey

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    position,
    handleMouseDown,
    isDragging,
  };
};