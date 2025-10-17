import React from "react";
import type { SceneItem } from "../../context/UiContext";

interface SceneItemListProps {
  items: SceneItem[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  onDeselectAll: () => void;
}

export const SceneItemList: React.FC<SceneItemListProps> = ({
  items,
  selectedId,
  onSelectItem,
  onDeselectAll,
}) => {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          Scene Items ({items.length})
        </h4>
        {selectedId && (
          <button
            type="button"
            onClick={onDeselectAll}
            className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
          >
            Deselect
          </button>
        )}
      </div>
      <div className="flex max-h-36 flex-col gap-2 overflow-y-auto">
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item.id)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/40 text-foreground hover:border-primary/40"}`}
            >
              <span aria-hidden>{item.type === "puppet" ? "🎭" : "🖼️"}</span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-border px-3 py-2 text-center text-xs text-muted-foreground">
            No items in scene
          </div>
        )}
      </div>
    </section>
  );
};
