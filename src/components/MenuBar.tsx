import { memo, useState, useRef, useEffect, useCallback } from "react";
import { useUi } from "../context/UiContext";
import { useAnimation } from "../context/AnimationContext";
import {
  serializeProject,
  saveProjectToFile,
  loadProjectFromFile,
} from "../utils/projectSerializer";

export const MenuBar = memo(() => {
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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = useCallback(() => {
    const svgEl = document.querySelector("svg[data-scene]");
    const bgEl = svgEl?.querySelector("image") as SVGImageElement | null;
    const background = bgEl?.getAttribute("href") || null;

    const projectData = serializeProject({
      sceneItems,
      tracks,
      duration,
      background,
    });

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    saveProjectToFile(projectData, `animation-${timestamp}.bab.json`);
    setOpenMenu(null);
  }, [sceneItems, tracks, duration]);

  const handleLoad = useCallback(async () => {
    if (sceneItems.length > 0) {
      const confirmed = window.confirm(
        "Loading a project will replace the current scene. Continue?",
      );
      if (!confirmed) return;
    }

    try {
      const projectData = await loadProjectFromFile();
      window.dispatchEvent(
        new CustomEvent("project:load", { detail: projectData }),
      );
      setOpenMenu(null);
    } catch (error) {
      console.error("Failed to load project:", error);
      alert("Failed to load project file");
    }
  }, [sceneItems]);

  const toggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  return (
    <div className="menubar" ref={menuRef}>
      <div className="menubar-left">
        <div className="app-title">BaB</div>

        <div className="menu-bar">
          <div className="menu-item">
            <button onClick={() => toggleMenu("file")} className="menu-trigger">
              File
            </button>
            {openMenu === "file" && (
              <div className="dropdown-menu">
                <button onClick={handleSave}>
                  <span>Save Project</span>
                  <span className="menu-shortcut">Ctrl+S</span>
                </button>
                <button onClick={handleLoad}>
                  <span>Open Project</span>
                </button>
              </div>
            )}
          </div>

          <div className="menu-item">
            <button onClick={() => toggleMenu("view")} className="menu-trigger">
              View
            </button>
            {openMenu === "view" && (
              <div className="dropdown-menu">
                <button
                  onClick={() => {
                    setShowLibrary(!showLibrary);
                    setOpenMenu(null);
                  }}
                >
                  <span className="menu-check">{showLibrary ? "✓" : ""}</span>
                  <span>Library</span>
                  <span className="menu-shortcut">Ctrl+L</span>
                </button>
                <button
                  onClick={() => {
                    setShowInspector(!showInspector);
                    setOpenMenu(null);
                  }}
                >
                  <span className="menu-check">{showInspector ? "✓" : ""}</span>
                  <span>Inspector</span>
                  <span className="menu-shortcut">Ctrl+I</span>
                </button>
                <button
                  onClick={() => {
                    setShowLayers(!showLayers);
                    setOpenMenu(null);
                  }}
                >
                  <span className="menu-check">{showLayers ? "✓" : ""}</span>
                  <span>Layers</span>
                </button>
                <button
                  onClick={() => {
                    setShowTimeline(!showTimeline);
                    setOpenMenu(null);
                  }}
                >
                  <span className="menu-check">{showTimeline ? "✓" : ""}</span>
                  <span>Timeline</span>
                  <span className="menu-shortcut">Ctrl+G</span>
                </button>
                <div className="menu-separator" />
                <button
                  onClick={() => {
                    fitInView?.();
                    setOpenMenu(null);
                  }}
                >
                  <span className="menu-check"></span>
                  <span>Fit in View</span>
                  <span className="menu-shortcut">Ctrl+0</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="menubar-right">
        <button
          className="icon-btn"
          onClick={fitInView}
          title="Fit in View (Ctrl+0)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 1h6v2H3v4H1V1zm14 0h-6v2h4v4h2V1zM1 15h6v-2H3v-4H1v6zm14 0h-6v-2h4v-4h2v6z" />
          </svg>
        </button>
        <button
          className="icon-btn"
          onClick={handleSave}
          title="Save Project (Ctrl+S)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13 1H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zM4 3h8v4H4V3zm8 10H4V9h8v4z" />
          </svg>
        </button>
        <button className="icon-btn" onClick={handleLoad} title="Open Project">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 5h-4L8 3H2c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
});
