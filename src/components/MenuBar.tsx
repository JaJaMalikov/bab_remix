import { memo, useCallback } from "react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Icons } from "./ui/icons";
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
    <div className="flex h-14 items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold text-primary">BaB</span>
        <nav className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="px-3">
                File
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={handleSave}>
                Save Project
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleLoad}>
                Open Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="px-3">
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckboxItem
                checked={showLibrary}
                onCheckedChange={(checked) => setShowLibrary(Boolean(checked))}
              >
                Library
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showInspector}
                onCheckedChange={(checked) =>
                  setShowInspector(Boolean(checked))
                }
              >
                Inspector
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showLayers}
                onCheckedChange={(checked) => setShowLayers(Boolean(checked))}
              >
                Layers
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showTimeline}
                onCheckedChange={(checked) =>
                  setShowTimeline(Boolean(checked))
                }
              >
                Timeline
              </DropdownMenuCheckboxItem>
              <DropdownMenuItem onSelect={() => fitInView?.()}>
                Fit in View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={fitInView ?? undefined}
          title="Fit in View (Ctrl+0)"
        >
          <Icons.fit className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleSave}
          title="Save Project (Ctrl+S)"
        >
          <Icons.save className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleLoad}
          title="Open Project"
        >
          <Icons.open className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
