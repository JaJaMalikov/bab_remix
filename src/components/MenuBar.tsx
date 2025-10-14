import { memo, useCallback } from "react";
import * as Menubar from "@radix-ui/react-menubar";
import * as Toolbar from "@radix-ui/react-toolbar";
import {
  CheckIcon,
  DownloadIcon,
  EnterFullScreenIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
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
    } catch (error) {
      console.error("Failed to load project:", error);
      alert("Failed to load project file");
    }
  }, [sceneItems]);

  return (
    <div className="menubar">
      <div className="menubar-left">
        <div className="app-title">BaB</div>

        <Menubar.Root className="menu-bar" aria-label="Application menu">
          <Menubar.Menu>
            <Menubar.Trigger className="menu-trigger">File</Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content
                className="dropdown-menu"
                sideOffset={6}
                align="start"
                aria-label="File menu"
              >
                <Menubar.Item
                  className="dropdown-item"
                  onSelect={handleSave}
                >
                  <DownloadIcon className="menu-icon" aria-hidden />
                  <span>Save Project</span>
                  <span className="menu-shortcut">Ctrl+S</span>
                </Menubar.Item>
                <Menubar.Item
                  className="dropdown-item"
                  onSelect={handleLoad}
                >
                  <UploadIcon className="menu-icon" aria-hidden />
                  <span>Open Project</span>
                </Menubar.Item>
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>

          <Menubar.Menu>
            <Menubar.Trigger className="menu-trigger">View</Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content
                className="dropdown-menu"
                sideOffset={6}
                align="start"
                aria-label="View menu"
              >
                <Menubar.CheckboxItem
                  className="dropdown-item"
                  checked={showLibrary}
                  onCheckedChange={(checked) => setShowLibrary(Boolean(checked))}
                >
                  <span className="menu-check">
                    <Menubar.ItemIndicator forceMount>
                      <CheckIcon aria-hidden />
                    </Menubar.ItemIndicator>
                  </span>
                  <span>Library</span>
                  <span className="menu-shortcut">Ctrl+L</span>
                </Menubar.CheckboxItem>
                <Menubar.CheckboxItem
                  className="dropdown-item"
                  checked={showInspector}
                  onCheckedChange={(checked) =>
                    setShowInspector(Boolean(checked))
                  }
                >
                  <span className="menu-check">
                    <Menubar.ItemIndicator forceMount>
                      <CheckIcon aria-hidden />
                    </Menubar.ItemIndicator>
                  </span>
                  <span>Inspector</span>
                  <span className="menu-shortcut">Ctrl+I</span>
                </Menubar.CheckboxItem>
                <Menubar.CheckboxItem
                  className="dropdown-item"
                  checked={showLayers}
                  onCheckedChange={(checked) => setShowLayers(Boolean(checked))}
                >
                  <span className="menu-check">
                    <Menubar.ItemIndicator forceMount>
                      <CheckIcon aria-hidden />
                    </Menubar.ItemIndicator>
                  </span>
                  <span>Layers</span>
                </Menubar.CheckboxItem>
                <Menubar.CheckboxItem
                  className="dropdown-item"
                  checked={showTimeline}
                  onCheckedChange={(checked) =>
                    setShowTimeline(Boolean(checked))
                  }
                >
                  <span className="menu-check">
                    <Menubar.ItemIndicator forceMount>
                      <CheckIcon aria-hidden />
                    </Menubar.ItemIndicator>
                  </span>
                  <span>Timeline</span>
                  <span className="menu-shortcut">Ctrl+G</span>
                </Menubar.CheckboxItem>
                <Menubar.Separator className="menu-separator" />
                <Menubar.Item
                  className="dropdown-item"
                  onSelect={() => fitInView?.()}
                >
                  <EnterFullScreenIcon className="menu-icon" aria-hidden />
                  <span>Fit in View</span>
                  <span className="menu-shortcut">Ctrl+0</span>
                </Menubar.Item>
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
        </Menubar.Root>
      </div>

      <Toolbar.Root className="menubar-actions" aria-label="Quick actions">
        <Toolbar.Button
          className="icon-btn"
          onClick={fitInView}
          title="Fit in View (Ctrl+0)"
        >
          <EnterFullScreenIcon aria-hidden />
          <span className="sr-only">Fit in View</span>
        </Toolbar.Button>
        <Toolbar.Button
          className="icon-btn"
          onClick={handleSave}
          title="Save Project (Ctrl+S)"
        >
          <DownloadIcon aria-hidden />
          <span className="sr-only">Save Project</span>
        </Toolbar.Button>
        <Toolbar.Button
          className="icon-btn"
          onClick={handleLoad}
          title="Open Project"
        >
          <UploadIcon aria-hidden />
          <span className="sr-only">Open Project</span>
        </Toolbar.Button>
      </Toolbar.Root>
    </div>
  );
});
