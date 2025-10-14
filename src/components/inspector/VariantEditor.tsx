import React from 'react';
import type { SceneItem } from '../../context/UiContext';

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
    <div className="property-group">
      <h4>Variants</h4>
      {selectedItem.metadata.variantGroups.map((group) => (
        <div key={group.group} className="property">
          <label>{group.group}</label>
          <select
            value={
              getCurrentVariant(group.group) ||
              group.variants.find((v) => v.isDefault)?.name ||
              ''
            }
            onChange={(e) => handleVariantChange(group.group, e.target.value)}
            style={{ width: '100%', padding: '4px 6px', fontSize: 11 }}
          >
            {group.variants.map((variant) => (
              <option key={variant.name || 'unknown'} value={variant.name || ''}>
                {variant.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};
