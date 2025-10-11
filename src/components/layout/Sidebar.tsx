import { ReactNode, useState, useRef, useCallback, useEffect } from "react";

interface SidebarProps {
  side: "left" | "right";
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey: string;
}

export function Sidebar({
  side,
  children,
  defaultWidth = 280,
  minWidth = 200,
  maxWidth = 600,
  storageKey,
}: SidebarProps) {
  const [width, setWidth] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? parseInt(stored, 10) : defaultWidth;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = side === "left"
        ? e.clientX - startXRef.current
        : startXRef.current - e.clientX;

      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(storageKey, String(width));
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, side, minWidth, maxWidth, storageKey, width]);

  return (
    <div
      ref={sidebarRef}
      className={`sidebar sidebar-${side} ${isResizing ? 'resizing' : ''}`}
      style={{ width, flexShrink: 0 }}
    >
      <div className="sidebar-content">{children}</div>
      <div
        className={`sidebar-resize-handle resize-${side}`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
