import * as Tooltip from "@radix-ui/react-tooltip";
import { useMemo, useCallback } from "react";

import { useUi } from "../../context/UiContext";
import { useAnimation } from "../../context/AnimationContext";
import { Icons } from "../ui/icons";
import { cn } from "../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  serializeProject,
  saveProjectToFile,
  loadProjectFromFile,
} from "../../utils/projectSerializer";

const SIDEBAR_ITEMS = [
  { id: "library", label: "Library", icon: Icons.library, shortcut: "Ctrl+L" },
  {
    id: "inspector",
    label: "Inspector",
    icon: Icons.inspector,
    shortcut: "Ctrl+I",
  },
  { id: "layers", label: "Layers", icon: Icons.layers, shortcut: "Ctrl+G" },
] as const;

type SidebarPanel = (typeof SIDEBAR_ITEMS)[number]["id"];

export function Sidebar() {
  const {
    showLibrary,
    setShowLibrary,
    showInspector,
    setShowInspector,
    showLayers,
    setShowLayers,
    showTimeline,
    setShowTimeline,
    fitInView,
    sceneItems,
  } = useUi();

  const { tracks, duration } = useAnimation();

  const activePanel = useMemo<SidebarPanel | null>(() => {
    if (showLibrary) return "library";
    if (showInspector) return "inspector";
    if (showLayers) return "layers";
    return null;
  }, [showLibrary, showInspector, showLayers]);

  const togglePanel = (panel: SidebarPanel) => {
    const isActive = activePanel === panel;

    setShowLibrary(panel === "library" ? !isActive : false);
    setShowInspector(panel === "inspector" ? !isActive : false);
    setShowLayers(panel === "layers" ? !isActive : false);
  };

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
    <aside className="flex h-full w-12 flex-col items-center border-r border-border bg-muted/30">
      <Tooltip.Provider delayDuration={200}>
        {/* Menu dropdown at top */}
        <div className="flex w-full flex-col items-center gap-1.5 border-b border-border py-3">
          <DropdownMenu>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Menu"
                  >
                    <Icons.menu className="h-5 w-5" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
              </Tooltip.Trigger>
              <Tooltip.Content
                className="z-50 rounded-md border border-border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md"
                side="right"
                sideOffset={8}
              >
                Menu
                <Tooltip.Arrow className="fill-border" />
              </Tooltip.Content>
            </Tooltip.Root>
            <DropdownMenuContent align="start" side="right">
              <DropdownMenuItem onSelect={handleSave}>
                <Icons.save className="mr-2 h-4 w-4" />
                Save Project
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleLoad}>
                <Icons.open className="mr-2 h-4 w-4" />
                Open Project
              </DropdownMenuItem>
              <DropdownMenuCheckboxItem
                checked={showTimeline}
                onCheckedChange={(checked) => setShowTimeline(Boolean(checked))}
              >
                Timeline
              </DropdownMenuCheckboxItem>
              <DropdownMenuItem onSelect={() => fitInView?.()}>
                <Icons.fit className="mr-2 h-4 w-4" />
                Fit in View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Panel buttons */}
        <div className="flex flex-1 flex-col items-center gap-1.5 py-3">
          {SIDEBAR_ITEMS.map(({ id, label, icon: Icon, shortcut }) => {
            const selected = activePanel === id;
            return (
              <Tooltip.Root key={id}>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground",
                      selected && "bg-primary/10 text-primary",
                    )}
                    onClick={() => togglePanel(id)}
                    aria-pressed={selected}
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content
                  className="z-50 rounded-md border border-border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md"
                  side="right"
                  sideOffset={8}
                >
                  <div className="flex flex-col">
                    <span className="text-xs">{label}</span>
                    <span className="text-[10px] text-muted-foreground">{shortcut}</span>
                  </div>
                  <Tooltip.Arrow className="fill-border" />
                </Tooltip.Content>
              </Tooltip.Root>
            );
          })}
        </div>
      </Tooltip.Provider>
    </aside>
  );
}
