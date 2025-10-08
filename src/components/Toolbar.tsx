import { memo, useState, useCallback } from "react";
import { useDraggable } from "../hooks/useDraggable";
import { useUi } from "../context/UiContext";

export const Toolbar = memo(() => {
  const {
    showTimeline,
    setShowTimeline,
    showLibrary,
    setShowLibrary,
    showInspector,
    setShowInspector,
    showLayers,
    setShowLayers,
    fitInView,
  } = useUi();
  const { position, handleMouseDown, isDragging } = useDraggable({ x: window.innerWidth / 2 - 200, y: 20 }, { storageKey: 'pos:toolbar' });
  const [collapsed, setCollapsed] = useState(false as boolean);

  // Memoize all callbacks to prevent re-creation on each render
  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(c => !c);
  }, []);

  const handleToggleTimeline = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTimeline(!showTimeline);
  }, [setShowTimeline, showTimeline]);

  const handleToggleLibrary = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLibrary(!showLibrary);
  }, [setShowLibrary, showLibrary]);

  const handleToggleInspector = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInspector(!showInspector);
  }, [setShowInspector, showInspector]);

  const handleToggleLayers = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLayers(!showLayers);
  }, [setShowLayers, showLayers]);

  const handleFitInView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    fitInView?.();
  }, [fitInView]);

  return (
    <div
      className={`toolbar ${isDragging ? 'dragging' : ''}`}
      style={{ position: 'absolute', left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <span className="toolbar-grip drag-handle" />
      <div className="toolbar-group">
        <button className={`toolbar-btn toggle-all`} onClick={handleToggleCollapse}>
          {collapsed ? '➕' : '➖'}
          <span className="toolbar-label">Toolbar</span>
        </button>
        {collapsed ? null : <>
        <button className={`toolbar-btn ${showTimeline ? 'active' : ''}`} onClick={handleToggleTimeline}>
          ▶
          <span className="toolbar-label">Timeline</span>
        </button>
        <button className={`toolbar-btn ${showLibrary ? 'active' : ''}`} onClick={handleToggleLibrary}>
          📚
          <span className="toolbar-label">Library</span>
        </button>
        <button className={`toolbar-btn ${showInspector ? 'active' : ''}`} onClick={handleToggleInspector}>
          🔎
          <span className="toolbar-label">Inspector</span>
        </button>
        <button className={`toolbar-btn ${showLayers ? 'active' : ''}`} onClick={handleToggleLayers}>
          🧅
          <span className="toolbar-label">Layers</span>
        </button>
        <button className={`toolbar-btn`} onClick={handleFitInView}>
          ⤢
          <span className="toolbar-label">Fit</span>
        </button>
        </>}
      </div>
    </div>
  );
});
