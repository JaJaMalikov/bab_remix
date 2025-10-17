import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import React from "react";
import { AnimationProperty } from "../../context/AnimationContext";

interface MemberTransformEditorProps {
  angle: number;
  onAngleChange: (angle: number) => void;
  onAddKeyframe: (property: AnimationProperty, value: number) => void;
  hasKeyframe: (property: AnimationProperty) => boolean;
}

export const MemberTransformEditor: React.FC<MemberTransformEditorProps> = ({
  angle,
  onAngleChange,
  onAddKeyframe,
  hasKeyframe,
}) => {
  return (
    <section className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-foreground">Member Transform</h4>
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Rotation
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={Math.round(angle)}
            onChange={(event) =>
              onAngleChange(parseFloat(event.target.value || "0") || 0)
            }
            className="h-8 w-24 text-right"
          />
          <Button
            type="button"
            onClick={() => onAddKeyframe('rotation', angle)}
            title="Add keyframe"
            variant={hasKeyframe('rotation') ? 'default' : 'secondary'}
            size="sm"
            className="h-8 w-8 px-0"
          >
            ◆
          </Button>
        </div>
      </div>
      <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
        <Slider
          min={-180}
          max={180}
          step={1}
          value={[angle]}
          onValueChange={([value]) => onAngleChange(value)}
        />
      </div>
    </section>
  );
};
