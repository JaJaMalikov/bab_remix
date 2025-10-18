import * as Tooltip from "@radix-ui/react-tooltip";
import { useMemo, useCallback } from "react";

import { useUi } from "../../context/UiContext";
import { useAnimation } from "../../context/AnimationContext";
import { Icons } from "../ui/icons";
import { cn } from "../../lib/utils";
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
        {/* Top section - all buttons */}
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

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={() => setShowTimeline(!showTimeline)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground",
                  showTimeline && "bg-primary/10 text-primary",
                )}
                aria-label="Toggle Timeline"
                aria-pressed={showTimeline}
              >
                <Icons.timeline className="h-5 w-5" aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content
              className="z-50 rounded-md border border-border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md"
              side="right"
              sideOffset={8}
            >
              Timeline
              <Tooltip.Arrow className="fill-border" />
            </Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={() => fitInView?.()}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Fit in View"
              >
                <Icons.fit className="h-5 w-5" aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content
              className="z-50 rounded-md border border-border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md"
              side="right"
              sideOffset={8}
            >
              Fit in View
              <Tooltip.Arrow className="fill-border" />
            </Tooltip.Content>
          </Tooltip.Root>
        </div>

        {/* Bottom section - action buttons */}
        <div className="flex flex-col items-center gap-1.5 border-t border-border py-3">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={handleSave}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Save Project"
              >
                <Icons.save className="h-5 w-5" aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content
              className="z-50 rounded-md border border-border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md"
              side="right"
              sideOffset={8}
            >
              Save Project
              <Tooltip.Arrow className="fill-border" />
            </Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={handleLoad}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Open Project"
              >
                <Icons.open className="h-5 w-5" aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content
              className="z-50 rounded-md border border-border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md"
              side="right"
              sideOffset={8}
            >
              Open Project
              <Tooltip.Arrow className="fill-border" />
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      </Tooltip.Provider>
    </aside>
  );
}
