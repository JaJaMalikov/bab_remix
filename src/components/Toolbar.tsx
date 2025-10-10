import { memo, useState, useCallback } from "react";
import { useDraggable } from "../hooks/useDraggable";
import { useUi } from "../context/UiContext";
import { useAnimation } from "../context/AnimationContext";
import { serializeProject, saveProjectToFile, loadProjectFromFile } from "../utils/projectSerializer";

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
    sceneItems,
  } = useUi();

  const { tracks, duration } = useAnimation();
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

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Get background from DOM
    const svgEl = document.querySelector('svg[data-scene]');
    const bgEl = svgEl?.querySelector('image') as SVGImageElement | null;
    const background = bgEl?.getAttribute('href') || null;

    const projectData = serializeProject({
      sceneItems,
      tracks,
      duration,
      background,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    saveProjectToFile(projectData, `animation-${timestamp}.bab.json`);
  }, [sceneItems, tracks, duration]);

  const handleLoad = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (sceneItems.length > 0) {
      const confirmed = window.confirm(
        "Loading a project will replace the current scene. Continue?"
      );
      if (!confirmed) return;
    }

    try {
      const projectData = await loadProjectFromFile();

      // Trigger reload via event
      window.dispatchEvent(
        new CustomEvent("project:load", { detail: projectData })
      );
    } catch (error) {
      console.error("Failed to load project:", error);
      alert("Failed to load project file");
    }
  }, [sceneItems]);

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
        <button className={`toolbar-btn`} onClick={handleSave}>
          💾
          <span className="toolbar-label">Save</span>
        </button>
        <button className={`toolbar-btn`} onClick={handleLoad}>
          📂
          <span className="toolbar-label">Load</span>
        </button>
        </>}
      </div>
    </div>
  );
});
