import { ReactNode } from "react";
import { useDraggable, Position } from "../hooks/useDraggable";

interface FloatingPanelProps {
  title: string;
  initialPosition: Position;
  children: ReactNode;
  width?: number;
  height?: number;
}

export const FloatingPanel = ({
  title,
  initialPosition,
  children,
  width = 300,
  height = 400,
}: FloatingPanelProps) => {
  const { position, handleMouseDown, isDragging } =
    useDraggable(initialPosition);

  return (
    <div
      className={`floating-panel ${isDragging ? "dragging" : ""}`}
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="panel-header drag-handle">
        <h3>{title}</h3>
      </div>
      <div className="panel-content">{children}</div>
    </div>
  );
};
