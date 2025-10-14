import React, { useState, useCallback, useEffect } from 'react';
import type { SceneItem } from '../../context/UiContext';
import { useUi } from '../../context/UiContext';

interface ItemPropertiesProps {
  item: SceneItem;
}

export const ItemProperties: React.FC<ItemPropertiesProps> = ({ item }) => {
  const { updateSceneItemLabel } = useUi();
  const [isEditing, setIsEditing] = useState(false);
  const [labelInput, setLabelInput] = useState(item.label);

  useEffect(() => {
    setLabelInput(item.label);
    setIsEditing(false);
  }, [item]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSaveLabel = useCallback(() => {
    if (labelInput.trim()) {
      updateSceneItemLabel(item.id, labelInput.trim());
    }
    setIsEditing(false);
  }, [item.id, labelInput, updateSceneItemLabel]);

  return (
    <div className="property-group">
      <h4>Properties</h4>
      <div className="property">
        <label>Type</label>
        <div>
          {item.type === 'puppet'
            ? 'Puppet'
            : item.el instanceof SVGImageElement
            ? 'Image'
            : 'Object'}
        </div>
      </div>
      <div className="property">
        <label>Name</label>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
              autoFocus
              style={{ flex: 1, padding: '4px 6px', fontSize: 11 }}
            />
            <button onClick={handleSaveLabel} style={{ padding: '4px 8px', fontSize: 10 }}>
              ✓
            </button>
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
          >
            {item.label}
          </div>
        )}
      </div>
    </div>
  );
};
