import { useState, useCallback, useRef, useEffect } from "react";

export interface Size {
  width: number;
  height: number;
}

type Options = {
  storageKey?: string;
};

/**
 * A hook to make a component resizable.
 * It handles the state logic, event listeners, and persisting the size to localStorage.
 */
export const useResizable = (initialSize: Size, options: Options = {}) => {
  const [size, setSize] = useState<Size>(initialSize);
  const [isResizing, setIsResizing] = useState(false);

  // Use a ref to access the latest size in callbacks without making them unstable.
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const resizeStartRef = useRef<{ startX: number; startY: number; w0: number; h0: number } | null>(null);
  const { storageKey } = options;

  // Load size from storage on mount or when storageKey changes.
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(`${storageKey}:size`);
      if (raw) {
        const v = JSON.parse(raw) as { width?: number; height?: number };
        // Use functional update to avoid depending on size state
        setSize(currentSize => ({
            width: typeof v?.width === 'number' ? v.width : currentSize.width,
            height: typeof v?.height === 'number' ? v.height : currentSize.height,
        }));
      }
    } catch {}
  }, [storageKey]);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      w0: sizeRef.current.width,
      h0: sizeRef.current.height,
    };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeStartRef.current) return;
    const dx = e.clientX - resizeStartRef.current.startX;
    const dy = e.clientY - resizeStartRef.current.startY;
    const nw = Math.max(100, Math.round(resizeStartRef.current.w0 + dx));
    const nh = Math.max(100, Math.round(resizeStartRef.current.h0 + dy));
    setSize({ width: nw, height: nh });
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    resizeStartRef.current = null;
    if (storageKey) {
      try {
        localStorage.setItem(`${storageKey}:size`, JSON.stringify(sizeRef.current));
      } catch {}
    }
  }, [storageKey]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    size,
    onResizeMouseDown,
    isResizing, // Expose for potential styling changes
  };
};
