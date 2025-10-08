import { useState, useCallback, useRef, useEffect } from "react";

export interface Position {
  x: number;
  y: number;
}

type Options = {
  storageKey?: string;
};

export const useDraggable = (initialPosition: Position, options: Options = {}) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const storageKey = options.storageKey;

  // Load from storage once
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".drag-handle")) {
        setIsDragging(true);
        dragStartPos.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
      }
    },
    [position],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && dragStartPos.current) {
        setPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y,
        });
      }
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartPos.current = null;
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(position));
      } catch {}
    }
  }, [position, storageKey]);

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
