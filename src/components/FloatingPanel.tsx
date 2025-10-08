import { ReactNode } from "react";
import { useDraggable, Position } from "../hooks/useDraggable";
import { useResizable } from "../hooks/useResizable";

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
  const { position, handleMouseDown, isDragging } = useDraggable(
    initialPosition,
    { storageKey }
  );
  const { size, onResizeMouseDown, isResizing } = useResizable(
    { width, height },
    { storageKey }
  );

  return (
    <div
      className={`floating-panel ${isDragging || isResizing ? "dragging" : ""}`}
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
        <div
          className="panel-resizer"
          onMouseDown={onResizeMouseDown}
          title="Resize"
        />
      )}
    </div>
  );
};
