import React from "react";
import type { SceneItem } from "../../context/UiContext";
import { AnimationProperty } from "../../context/AnimationContext";
import { TransformInput } from "./TransformInput";
import { Slider } from "../ui/slider";

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
    <section className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-foreground">Transform</h4>
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
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
            <Slider
              min={-180}
              max={180}
              step={1}
              value={[transform.rotation]}
              onValueChange={([value]) => handleRotationChange(value)}
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
    </section>
  );
};
