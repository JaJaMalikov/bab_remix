import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import React from "react";

interface MemberTransformEditorProps {
  angle: number;
  onAngleChange: (angle: number) => void;
}

export const MemberTransformEditor: React.FC<MemberTransformEditorProps> = ({
  angle,
  onAngleChange,
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[10px] font-medium uppercase text-muted-foreground">
        Rotation
      </span>
      <Input
        type="number"
        value={Math.round(angle)}
        onChange={(event) =>
          onAngleChange(parseFloat(event.target.value || "0") || 0)
        }
        className="h-6 w-16 text-right text-xs"
      />
      <div className="flex-1 rounded border border-border bg-muted/20 px-2 py-1">
        <Slider
          min={-180}
          max={180}
          step={1}
          value={[angle]}
          onValueChange={([value]) => onAngleChange(value)}
        />
      </div>
    </div>
  );
};
