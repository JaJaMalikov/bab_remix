import React from "react";
import type { SceneItem } from "../../context/UiContext";

interface VariantEditorProps {
  selectedItem: SceneItem;
  getCurrentVariant: (groupName: string) => string | null;
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
    <section className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-foreground">Variants</h4>
      {selectedItem.metadata.variantGroups.map((group) => (
        <div key={group.group} className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
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
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {group.variants.map((variant) => (
              <option key={variant.name || "unknown"} value={variant.name || ""}>
                {variant.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </section>
  );
};
