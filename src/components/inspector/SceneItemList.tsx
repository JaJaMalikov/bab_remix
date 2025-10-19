import React from "react";
import type { SceneItem } from "../../context/UiContext";
import { cn } from "../../lib/utils";

interface SceneItemListProps {
  /** La liste des éléments présents dans la scène. */
  items: SceneItem[];
  /** L'ID de l'élément actuellement sélectionné. */
  selectedId: string | null;
  /** Callback appelé lorsqu'un élément est sélectionné. */
  onSelectItem: (id: string) => void;
  /** Callback appelé pour désélectionner tous les éléments. */
  onDeselectAll: () => void;
  /** Callback appelé lorsqu'un élément doit être supprimé. */
  onDeleteItem: (id: string) => void;
}

export const SceneItemList: React.FC<SceneItemListProps> = ({
  items,
  selectedId,
  onSelectItem,
  onDeselectAll,
  onDeleteItem,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          ITEMS ({items.length})
        </span>
        {selectedId && (
          <button
            type="button"
            onClick={onDeselectAll}
            className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground hover:border-primary/60 hover:text-foreground"
          >
            Deselect
          </button>
        )}
      </div>
      <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-1 rounded border px-2 py-1",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/40"
              )}
            >
              <button
                type="button"
                onClick={() => onSelectItem(item.id)}
                className="flex flex-1 items-center gap-1.5 text-left text-xs text-foreground hover:text-primary"
              >
                <span aria-hidden>{item.type === "puppet" ? "🎭" : "🖼️"}</span>
                <span className="truncate">{item.label}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id);
                }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                title="Delete item"
              >
                ×
              </button>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="rounded border border-dashed border-border px-2 py-2 text-center text-[10px] text-muted-foreground">
            No items in scene
          </div>
        )}
      </div>
    </div>
  );
};
