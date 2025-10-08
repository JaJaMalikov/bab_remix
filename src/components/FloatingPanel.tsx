import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useDraggable, Position } from "../hooks/useDraggable";

interface FloatingPanelProps {
  title: string;
  initialPosition: Position;
  children: ReactNode;
  width?: number;
  height?: number;
  storageKey?: string;
  resizable?: boolean;
}

export const FloatingPanel = ({
  title,
  initialPosition,
  children,
  width = 300,
  height = 400,
  storageKey,
  resizable = true,
}: FloatingPanelProps) => {
  const { position, handleMouseDown, isDragging } =
    useDraggable(initialPosition, { storageKey });

  const [size, setSize] = useState<{ width: number; height: number }>({ width, height });
  const sizeRef = useRef(size);
  useEffect(() => { sizeRef.current = size; }, [size]);
  const resizingRef = useRef<null | { startX: number; startY: number; w0: number; h0: number }>(null);

  // Load persisted size
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(`${storageKey}:size`);
      if (raw) {
        const v = JSON.parse(raw) as { width?: number; height?: number };
        const wv = typeof v?.width === 'number' ? v.width : size.width;
        const hv = typeof v?.height === 'number' ? v.height : size.height;
        setSize({ width: wv, height: hv });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResizeDown = useCallback((e: React.MouseEvent) => {
    if (!resizable) return;
    e.stopPropagation();
    resizingRef.current = { startX: e.clientX, startY: e.clientY, w0: size.width, h0: size.height };
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const dx = ev.clientX - resizingRef.current.startX;
      const dy = ev.clientY - resizingRef.current.startY;
      const nw = Math.max(100, Math.round(resizingRef.current.w0 + dx));
      const nh = Math.max(100, Math.round(resizingRef.current.h0 + dy));
      setSize({ width: nw, height: nh });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (storageKey) {
        try {
          const s = sizeRef.current;
          localStorage.setItem(`${storageKey}:size`, JSON.stringify({ width: s.width, height: s.height }));
        } catch {}
      }
      resizingRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [resizable, size, storageKey]);

  return (
    <div
      className={`floating-panel ${isDragging ? "dragging" : ""}`}
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="panel-header drag-handle">
        <h3>{title}</h3>
      </div>
      <div className="panel-content">{children}</div>
      {resizable && (
        <div className="panel-resizer" onMouseDown={onResizeDown} title="Resize" />
      )}
    </div>
  );
};
