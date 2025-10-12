import React, { ReactNode, useState, useEffect, useCallback } from "react";
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
  onClose?: () => void;
}

export const FloatingPanel = ({
  title,
  initialPosition,
  children,
  width = 300,
  height = 400,
  storageKey,
  resizable = true,
  onClose,
}: FloatingPanelProps) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const { size, onResizeMouseDown, isResizing } = useResizable(
    { width, height },
    { storageKey }
  );
  const { position, handleMouseDown, isDragging } = useDraggable(
    initialPosition,
    { storageKey, panelWidth: size.width, panelHeight: size.height }
  );

  // Load minimized state from localStorage
  useEffect(() => {
    if (storageKey) {
      try {
        const minimizedKey = `${storageKey}:minimized`;
        const saved = localStorage.getItem(minimizedKey);
        if (saved === 'true') {
          setIsMinimized(true);
        }
      } catch {}
    }
  }, [storageKey]);

  // Save minimized state to localStorage
  const toggleMinimize = useCallback(() => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    if (storageKey) {
      try {
        localStorage.setItem(`${storageKey}:minimized`, String(newState));
      } catch {}
    }
  }, [isMinimized, storageKey]);

  const handlePanelMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't start dragging if clicking on control buttons
    const target = e.target as HTMLElement;
    if (target.closest('.panel-controls')) {
      return;
    }
    handleMouseDown(e);
  }, [handleMouseDown]);

  return (
    <div
      className={`floating-panel ${isDragging || isResizing ? "dragging" : ""} ${isMinimized ? "minimized" : ""}`}
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
      }}
      onMouseDown={handlePanelMouseDown}
    >
      <div className="panel-header drag-handle">
        <h3>{title}</h3>
        <div className="panel-controls">
          <button
            className="panel-btn minimize-btn"
            onClick={toggleMinimize}
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 3l4 4H2z"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="2" y="5" width="8" height="2"/>
              </svg>
            )}
          </button>
          {onClose && (
            <button
              className="panel-btn close-btn"
              onClick={onClose}
              title="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </button>
          )}
        </div>
      </div>
      {!isMinimized && (
        <>
          <div className="panel-content">{children}</div>
          {resizable && (
            <div
              className="panel-resizer"
              onMouseDown={onResizeMouseDown}
              title="Resize"
            />
          )}
        </>
      )}
    </div>
  );
};
