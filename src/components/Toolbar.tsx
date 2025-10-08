import { useState } from "react";
import { useDraggable } from "../hooks/useDraggable";
import { useUi } from "../context/UiContext";

export const Toolbar = () => {
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

  return (
    <div
      className={`toolbar ${isDragging ? 'dragging' : ''}`}
      style={{ position: 'absolute', left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <span className="toolbar-grip drag-handle" />
      <div className="toolbar-group">
        <button className={`toolbar-btn toggle-all`} onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}>
          {collapsed ? '➕' : '➖'}
          <span className="toolbar-label">Toolbar</span>
        </button>
        {collapsed ? null : <>
        <button className={`toolbar-btn ${showTimeline ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowTimeline(!showTimeline); }}>
          ▶
          <span className="toolbar-label">Timeline</span>
        </button>
        <button className={`toolbar-btn ${showLibrary ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowLibrary(!showLibrary); }}>
          📚
          <span className="toolbar-label">Library</span>
        </button>
        <button className={`toolbar-btn ${showInspector ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowInspector(!showInspector); }}>
          🔎
          <span className="toolbar-label">Inspector</span>
        </button>
        <button className={`toolbar-btn ${showLayers ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowLayers(!showLayers); }}>
          🧅
          <span className="toolbar-label">Layers</span>
        </button>
        <button className={`toolbar-btn`} onClick={(e) => { e.stopPropagation(); fitInView?.(); }}>
          ⤢
          <span className="toolbar-label">Fit</span>
        </button>
        </>}
      </div>
    </div>
  );
};
