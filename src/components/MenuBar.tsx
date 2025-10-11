import { memo, useState, useRef, useEffect, useCallback } from "react";
import { useUi } from "../context/UiContext";
import { useAnimation } from "../context/AnimationContext";
import { serializeProject, saveProjectToFile, loadProjectFromFile } from "../utils/projectSerializer";

// Workspace preset management
const saveWorkspace = (name: string) => {
  const workspace = {
    name,
    timestamp: Date.now(),
    panels: {
      library: localStorage.getItem('pos:panel:library'),
      librarySize: localStorage.getItem('pos:panel:library:size'),
      libraryMinimized: localStorage.getItem('pos:panel:library:minimized'),
      inspector: localStorage.getItem('pos:panel:inspector'),
      inspectorSize: localStorage.getItem('pos:panel:inspector:size'),
      inspectorMinimized: localStorage.getItem('pos:panel:inspector:minimized'),
      layers: localStorage.getItem('pos:panel:layers'),
      layersSize: localStorage.getItem('pos:panel:layers:size'),
      layersMinimized: localStorage.getItem('pos:panel:layers:minimized'),
    }
  };
  localStorage.setItem(`workspace:${name}`, JSON.stringify(workspace));
};

const loadWorkspace = (name: string) => {
  const saved = localStorage.getItem(`workspace:${name}`);
  if (!saved) return false;

  try {
    const workspace = JSON.parse(saved);
    // Restore panel positions, sizes, and minimized states
    Object.entries(workspace.panels).forEach(([key, value]) => {
      if (value !== null) {
        localStorage.setItem(key, value as string);
      }
    });
    // Force page reload to apply workspace
    window.location.reload();
    return true;
  } catch {
    return false;
  }
};

const getWorkspaceList = (): string[] => {
  const workspaces: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('workspace:')) {
      workspaces.push(key.replace('workspace:', ''));
    }
  }
  return workspaces;
};

const deleteWorkspace = (name: string) => {
  localStorage.removeItem(`workspace:${name}`);
};

// Built-in workspace presets
const applyBuiltInWorkspace = (preset: 'default' | 'animation' | 'fullCanvas') => {
  switch (preset) {
    case 'default':
      localStorage.setItem('pos:panel:library', JSON.stringify({ x: 20, y: 100 }));
      localStorage.setItem('pos:panel:inspector', JSON.stringify({ x: window.innerWidth - 320, y: 20 }));
      localStorage.setItem('pos:panel:layers', JSON.stringify({ x: 20, y: 20 }));
      break;
    case 'animation':
      localStorage.setItem('pos:panel:library', JSON.stringify({ x: 0, y: 40 }));
      localStorage.setItem('pos:panel:inspector', JSON.stringify({ x: window.innerWidth - 300, y: 40 }));
      localStorage.setItem('pos:panel:layers', JSON.stringify({ x: 0, y: 350 }));
      break;
    case 'fullCanvas':
      localStorage.setItem('pos:panel:library:minimized', 'true');
      localStorage.setItem('pos:panel:inspector:minimized', 'true');
      localStorage.setItem('pos:panel:layers:minimized', 'true');
      break;
  }
  window.location.reload();
};

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
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load workspace list when workspace menu opens
  useEffect(() => {
    if (openMenu === 'workspace') {
      setWorkspaces(getWorkspaceList());
    }
  }, [openMenu]);

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
    setOpenMenu(null);
  }, [sceneItems, tracks, duration]);

  const handleLoad = useCallback(async () => {
    if (sceneItems.length > 0) {
      const confirmed = window.confirm(
        "Loading a project will replace the current scene. Continue?"
      );
      if (!confirmed) return;
    }

    try {
      const projectData = await loadProjectFromFile();
      window.dispatchEvent(
        new CustomEvent("project:load", { detail: projectData })
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

  const handleSaveWorkspace = useCallback(() => {
    const name = prompt('Enter workspace name:');
    if (name && name.trim()) {
      saveWorkspace(name.trim());
      alert(`Workspace "${name}" saved!`);
      setOpenMenu(null);
    }
  }, []);

  const handleLoadWorkspace = useCallback((name: string) => {
    if (confirm(`Load workspace "${name}"? This will reload the page.`)) {
      loadWorkspace(name);
    }
  }, []);

  const handleDeleteWorkspace = useCallback((name: string) => {
    if (confirm(`Delete workspace "${name}"?`)) {
      deleteWorkspace(name);
      setWorkspaces(getWorkspaceList());
    }
  }, []);

  const handleApplyPreset = useCallback((preset: 'default' | 'animation' | 'fullCanvas') => {
    if (confirm('Apply this workspace preset? This will reload the page.')) {
      applyBuiltInWorkspace(preset);
    }
  }, []);

  return (
    <div className="menubar" ref={menuRef}>
      <div className="menubar-left">
        <div className="app-title">BaB</div>

        <div className="menu-bar">
          <div className="menu-item">
            <button onClick={() => toggleMenu('file')} className="menu-trigger">
              File
            </button>
            {openMenu === 'file' && (
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
            <button onClick={() => toggleMenu('view')} className="menu-trigger">
              View
            </button>
            {openMenu === 'view' && (
              <div className="dropdown-menu">
                <button onClick={() => { setShowLibrary(!showLibrary); setOpenMenu(null); }}>
                  <span className="menu-check">{showLibrary ? '✓' : ''}</span>
                  <span>Library</span>
                  <span className="menu-shortcut">Ctrl+L</span>
                </button>
                <button onClick={() => { setShowInspector(!showInspector); setOpenMenu(null); }}>
                  <span className="menu-check">{showInspector ? '✓' : ''}</span>
                  <span>Inspector</span>
                  <span className="menu-shortcut">Ctrl+I</span>
                </button>
                <button onClick={() => { setShowLayers(!showLayers); setOpenMenu(null); }}>
                  <span className="menu-check">{showLayers ? '✓' : ''}</span>
                  <span>Layers</span>
                </button>
                <button onClick={() => { setShowTimeline(!showTimeline); setOpenMenu(null); }}>
                  <span className="menu-check">{showTimeline ? '✓' : ''}</span>
                  <span>Timeline</span>
                  <span className="menu-shortcut">Ctrl+G</span>
                </button>
                <div className="menu-separator" />
                <button onClick={() => { fitInView?.(); setOpenMenu(null); }}>
                  <span className="menu-check"></span>
                  <span>Fit in View</span>
                  <span className="menu-shortcut">Ctrl+0</span>
                </button>
              </div>
            )}
          </div>

          <div className="menu-item">
            <button onClick={() => toggleMenu('workspace')} className="menu-trigger">
              Workspace
            </button>
            {openMenu === 'workspace' && (
              <div className="dropdown-menu">
                <button onClick={handleSaveWorkspace}>
                  <span className="menu-check"></span>
                  <span>Save Current Workspace</span>
                </button>
                <div className="menu-separator" />
                <button onClick={() => { handleApplyPreset('default'); }}>
                  <span className="menu-check"></span>
                  <span>Default Layout</span>
                </button>
                <button onClick={() => { handleApplyPreset('animation'); }}>
                  <span className="menu-check"></span>
                  <span>Animation Layout</span>
                </button>
                <button onClick={() => { handleApplyPreset('fullCanvas'); }}>
                  <span className="menu-check"></span>
                  <span>Full Canvas (Minimized)</span>
                </button>
                {workspaces.length > 0 && (
                  <>
                    <div className="menu-separator" />
                    {workspaces.map((name) => (
                      <button
                        key={name}
                        onClick={() => handleLoadWorkspace(name)}
                        style={{ position: 'relative', paddingRight: 40 }}
                      >
                        <span className="menu-check"></span>
                        <span>{name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkspace(name);
                          }}
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            padding: '2px 6px',
                            fontSize: 10,
                            background: '#ff4444',
                            border: 'none',
                            borderRadius: 3,
                            color: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          ×
                        </button>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="menubar-right">
        <button className="icon-btn" onClick={fitInView} title="Fit in View (Ctrl+0)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 1h6v2H3v4H1V1zm14 0h-6v2h4v4h2V1zM1 15h6v-2H3v-4H1v6zm14 0h-6v-2h4v-4h2v6z"/>
          </svg>
        </button>
        <button className="icon-btn" onClick={handleSave} title="Save Project (Ctrl+S)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13 1H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zM4 3h8v4H4V3zm8 10H4V9h8v4z"/>
          </svg>
        </button>
        <button className="icon-btn" onClick={handleLoad} title="Open Project">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 5h-4L8 3H2c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
});
