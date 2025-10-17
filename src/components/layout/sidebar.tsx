import * as Tooltip from "@radix-ui/react-tooltip";
import { useMemo } from "react";

import { useUi } from "../../context/UiContext";
import { Icons } from "../ui/icons";
import { cn } from "../../lib/utils";

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
  } = useUi();

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

  return (
    <aside className="flex h-full w-16 flex-col items-center gap-2 border-r border-border bg-muted/30 py-4">
      <Tooltip.Provider delayDuration={200}>
        {SIDEBAR_ITEMS.map(({ id, label, icon: Icon, shortcut }) => {
          const selected = activePanel === id;
          return (
            <Tooltip.Root key={id}>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground",
                    selected && "bg-primary/10 text-primary",
                  )}
                  onClick={() => togglePanel(id)}
                  aria-pressed={selected}
                  aria-label={label}
                >
                  <Icon className="h-6 w-6" aria-hidden />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content
                className="z-50 rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md"
                side="right"
                sideOffset={8}
              >
                <div className="flex flex-col">
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">{shortcut}</span>
                </div>
                <Tooltip.Arrow className="fill-border" />
              </Tooltip.Content>
            </Tooltip.Root>
          );
        })}
      </Tooltip.Provider>
    </aside>
  );
}
