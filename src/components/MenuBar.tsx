import { memo, useCallback } from "react";
import { useUi } from "../context/UiContext";
import { useAnimation } from "../context/AnimationContext";
import {
  serializeProject,
  saveProjectToFile,
  loadProjectFromFile,
} from "../utils/projectSerializer";
import { Button } from "./ui/button";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarCheckboxItem,
  MenubarShortcut,
} from "./ui/menubar";

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
    <header className="sticky top-0 z-40 flex h-12 w-full items-center justify-between border-b border-border/60 bg-background/80 px-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="text-lg font-semibold tracking-tight text-primary">BaB</div>
        <Menubar className="border-none bg-transparent p-0 shadow-none backdrop-blur-none">
          <MenubarMenu>
            <MenubarTrigger className="px-3 py-2 text-sm font-medium">
              File
            </MenubarTrigger>
            <MenubarContent align="start">
              <MenubarItem onSelect={() => handleSave()} className="min-w-[14rem]">
                Save Project
                <MenubarShortcut>Ctrl+S</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={() => void handleLoad()}>
                Open Project
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="px-3 py-2 text-sm font-medium">
              View
            </MenubarTrigger>
            <MenubarContent align="start">
              <MenubarCheckboxItem
                checked={showLibrary}
                onCheckedChange={(checked) => setShowLibrary(Boolean(checked))}
                className="pr-8"
              >
                Library
                <MenubarShortcut>Ctrl+L</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                checked={showInspector}
                onCheckedChange={(checked) => setShowInspector(Boolean(checked))}
                className="pr-8"
              >
                Inspector
                <MenubarShortcut>Ctrl+I</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                checked={showLayers}
                onCheckedChange={(checked) => setShowLayers(Boolean(checked))}
                className="pr-8"
              >
                Layers
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                checked={showTimeline}
                onCheckedChange={(checked) => setShowTimeline(Boolean(checked))}
                className="pr-8"
              >
                Timeline
                <MenubarShortcut>Ctrl+G</MenubarShortcut>
              </MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => fitInView?.()}>
                Fit in View
                <MenubarShortcut>Ctrl+0</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={fitInView ?? undefined}
          title="Fit in View (Ctrl+0)"
          aria-label="Fit in View"
          className="text-muted-foreground hover:text-foreground"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M1 1h6v2H3v4H1V1zm14 0h-6v2h4v4h2V1zM1 15h6v-2H3v-4H1v6zm14 0h-6v-2h4v-4h2v6z" />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleSave()}
          title="Save Project (Ctrl+S)"
          aria-label="Save Project"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M13 1H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zM4 3h8v4H4V3zm8 10H4V9h8v4z" />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => void handleLoad()}
          title="Open Project"
          aria-label="Open Project"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M14 5h-4L8 3H2c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z" />
          </svg>
        </Button>
      </div>
    </header>
  );
});
