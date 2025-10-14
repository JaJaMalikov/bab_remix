import React from 'react';
import type { SceneItem } from '../../context/UiContext';
import { AnimationProperty } from '../../context/AnimationContext';
import { TransformInput } from './TransformInput';

interface TransformEditorProps {
  selectedItem: SceneItem;
  transform: { x: number; y: number; rotation: number; scaleX: number; scaleY: number; };
  handlePositionChange: (axis: 'x' | 'y', value: number) => void;
  handleRotationChange: (value: number) => void;
  handleScaleChange: (axis: 'scaleX' | 'scaleY', value: number) => void;
  handleAddKeyframe: (property: AnimationProperty, value: number) => void;
  hasKeyframe: (property: AnimationProperty) => boolean;
}

export const TransformEditor: React.FC<TransformEditorProps> = ({
  selectedItem,
  transform,
  handlePositionChange,
  handleRotationChange,
  handleScaleChange,
  handleAddKeyframe,
  hasKeyframe,
}) => {
  return (
    <div className="property-group">
      <h4>Transform</h4>
      <TransformInput
        label="Position X"
        value={transform.x}
        onChange={(v) => handlePositionChange('x', v)}
        onAddKeyframe={() => handleAddKeyframe('x', transform.x)}
        hasKeyframe={hasKeyframe('x')}
      />
      <TransformInput
        label="Position Y"
        value={transform.y}
        onChange={(v) => handlePositionChange('y', v)}
        onAddKeyframe={() => handleAddKeyframe('y', transform.y)}
        hasKeyframe={hasKeyframe('y')}
      />

      {selectedItem.type === 'image' && (
        <>
          <TransformInput
            label="Rotation"
            value={transform.rotation}
            onChange={handleRotationChange}
            onAddKeyframe={() => handleAddKeyframe('rotation', transform.rotation)}
            hasKeyframe={hasKeyframe('rotation')}
          />
          <div className="property">
            <input
              type="range"
              min="-180"
              max="180"
              value={transform.rotation}
              onChange={(e) => handleRotationChange(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <TransformInput
            label="Scale X"
            value={transform.scaleX}
            onChange={(v) => handleScaleChange('scaleX', v)}
            onAddKeyframe={() => handleAddKeyframe('scaleX', transform.scaleX)}
            hasKeyframe={hasKeyframe('scaleX')}
            isInteger={false}
            step={0.01}
          />
          <TransformInput
            label="Scale Y"
            value={transform.scaleY}
            onChange={(v) => handleScaleChange('scaleY', v)}
            onAddKeyframe={() => handleAddKeyframe('scaleY', transform.scaleY)}
            hasKeyframe={hasKeyframe('scaleY')}
            isInteger={false}
            step={0.01}
          />
        </>
      )}
    </div>
  );
};
