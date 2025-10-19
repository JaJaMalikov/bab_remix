import React from "react";
import type { SceneItem } from "../../context/UiContext";

interface VariantEditorProps {
  /** L'élément de la scène actuellement sélectionné (doit être un pantin). */
  selectedItem: SceneItem;
  /** Fonction pour obtenir le nom du variant actuellement actif pour un groupe donné. */
  getCurrentVariant: (groupName: string) => string | null;
  /** Callback pour changer le variant actif d'un groupe. */
  handleVariantChange: (groupName: string, variantName: string) => void;
}

export const VariantEditor: React.FC<VariantEditorProps> = ({
  selectedItem,
  getCurrentVariant,
  handleVariantChange,
}) => {
  if (
    selectedItem.type !== 'puppet' ||
    !selectedItem.metadata?.variantGroups ||
    selectedItem.metadata.variantGroups.length === 0
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {selectedItem.metadata.variantGroups.map((group) => (
        <div key={group.group} className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            {group.group}
          </span>
          <select
            value={
              getCurrentVariant(group.group) ||
              group.variants.find((v) => v.isDefault)?.name ||
              ""
            }
            onChange={(event) =>
              handleVariantChange(group.group, event.target.value)
            }
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {group.variants.map((variant) => (
              <option key={variant.name || "unknown"} value={variant.name || ""}>
                {variant.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};
