import React, { ReactNode, useCallback } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import * as Toolbar from "@radix-ui/react-toolbar";
import { ChevronDownIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useDraggable, Position } from "../hooks/useDraggable";
import { useResizable } from "../hooks/useResizable";
import { useLocalStorage } from "../hooks/useLocalStorage";

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
  const { size, onResizeMouseDown, isResizing } = useResizable(
    { width, height },
    { storageKey },
  );
  const { position, handleMouseDown, isDragging } = useDraggable(
    initialPosition,
    { storageKey, panelWidth: size.width, panelHeight: size.height },
  );

  const [isMinimized, setIsMinimized] = useLocalStorage(
    storageKey ? `${storageKey}:minimized` : null,
    false,
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsMinimized(!open);
    },
    [setIsMinimized],
  );

  const handlePanelMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't start dragging if clicking on control buttons
      const target = e.target as HTMLElement;
      if (target.closest(".panel-controls")) {
        return;
      }
      handleMouseDown(e);
    },
    [handleMouseDown],
  );

  return (
    <Collapsible.Root
      open={!isMinimized}
      onOpenChange={handleOpenChange}
      asChild
    >
      <div
        className={`floating-panel ${
          isDragging || isResizing ? "dragging" : ""
        } ${isMinimized ? "minimized" : ""}`}
        data-state={isMinimized ? "closed" : "open"}
        style={{
          position: "absolute",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: isMinimized ? "auto" : `${size.height}px`,
        }}
        onMouseDown={handlePanelMouseDown}
      >
        <div className="panel-header drag-handle">
          <h3>{title}</h3>
          <Toolbar.Root
            className="panel-controls"
            aria-label={`${title} controls`}
          >
            <Collapsible.Trigger asChild>
              <Toolbar.Button
                className="panel-btn minimize-btn"
                data-state={isMinimized ? "closed" : "open"}
                title={isMinimized ? "Expand panel" : "Collapse panel"}
              >
                <ChevronDownIcon aria-hidden />
                <span className="sr-only">
                  {isMinimized ? "Expand panel" : "Collapse panel"}
                </span>
              </Toolbar.Button>
            </Collapsible.Trigger>
            {onClose && (
              <Toolbar.Button
                className="panel-btn close-btn"
                onClick={onClose}
                title="Close panel"
              >
                <Cross2Icon aria-hidden />
                <span className="sr-only">Close panel</span>
              </Toolbar.Button>
            )}
          </Toolbar.Root>
        </div>
        <Collapsible.Content forceMount className="panel-collapsible">
          <div className="panel-body">
            <div className="panel-content">{children}</div>
            {resizable && (
              <div
                className="panel-resizer"
                onMouseDown={onResizeMouseDown}
                title="Resize"
              />
            )}
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
};
