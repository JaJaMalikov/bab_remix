import React from "react";
import type { SceneItem } from "../../context/UiContext";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";

interface TransformEditorProps {
  /** L'élément de la scène actuellement sélectionné. */
  selectedItem: SceneItem;
  /** L'objet contenant les transformations actuelles de l'élément (position, rotation, échelle). */
  transform: { x: number; y: number; rotation: number; scaleX: number; scaleY: number; };
  /** Callback pour gérer le changement de position (X ou Y). */
  handlePositionChange: (axis: "x" | "y", value: number) => void;
  /** Callback pour gérer le changement de rotation. */
  handleRotationChange: (value: number) => void;
  /** Callback pour gérer le changement d'échelle (X ou Y). */
  handleScaleChange: (axis: "scaleX" | "scaleY", value: number) => void;
}

export const TransformEditor: React.FC<TransformEditorProps> = ({
  selectedItem,
  transform,
  handlePositionChange,
  handleRotationChange,
  handleScaleChange,
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="w-6 text-[10px] font-medium uppercase text-muted-foreground">X</span>
        <Input
          type="number"
          value={Math.round(transform.x)}
          onChange={(e) => handlePositionChange('x', parseFloat(e.target.value || "0") || 0)}
          className="h-6 w-18 text-right text-xs"
        />
        <span className="w-6 text-[10px] font-medium uppercase text-muted-foreground">Y</span>
        <Input
          type="number"
          value={Math.round(transform.y)}
          onChange={(e) => handlePositionChange('y', parseFloat(e.target.value || "0") || 0)}
          className="h-6 w-18 text-right text-xs"
        />
      </div>

      {selectedItem.type === "image" && (
        <>
          <div className="flex items-center gap-2">
            <span className="w-16 text-[10px] font-medium uppercase text-muted-foreground">Rotation</span>
            <Input
              type="number"
              value={Math.round(transform.rotation)}
              onChange={(e) => handleRotationChange(parseFloat(e.target.value || "0") || 0)}
              className="h-6 w-16 text-right text-xs"
            />
            <div className="flex-1 rounded border border-border bg-muted/20 px-2 py-1">
              <Slider
                min={-180}
                max={180}
                step={1}
                value={[transform.rotation]}
                onValueChange={([value]) => handleRotationChange(value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 text-[10px] font-medium uppercase text-muted-foreground">Scale X</span>
            <Input
              type="number"
              step={0.01}
              value={transform.scaleX.toFixed(2)}
              onChange={(e) => handleScaleChange('scaleX', parseFloat(e.target.value || "1") || 1)}
              className="h-6 w-16 text-right text-xs"
            />
            <span className="w-16 text-[10px] font-medium uppercase text-muted-foreground">Y</span>
            <Input
              type="number"
              step={0.01}
              value={transform.scaleY.toFixed(2)}
              onChange={(e) => handleScaleChange('scaleY', parseFloat(e.target.value || "1") || 1)}
              className="h-6 w-16 text-right text-xs"
            />
          </div>
        </>
      )}
    </div>
  );
};
