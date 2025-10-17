import { Button } from "../ui/button";
import { Input } from "../ui/input";
import React from "react";

interface TransformInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onAddKeyframe: () => void;
  hasKeyframe: boolean;
  step?: number;
  isInteger?: boolean;
}

export const TransformInput: React.FC<TransformInputProps> = ({
  label,
  value,
  onChange,
  onAddKeyframe,
  hasKeyframe,
  step = 1,
  isInteger = true,
}) => {
  const displayValue = isInteger ? Math.round(value) : value.toFixed(2);

  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step={step}
          value={displayValue}
          onChange={(event) =>
            onChange(parseFloat(event.target.value || "0") || 0)
          }
          className="h-8 w-24 text-right"
        />
        <Button
          type="button"
          onClick={onAddKeyframe}
          title="Add keyframe"
          variant={hasKeyframe ? "default" : "secondary"}
          size="sm"
          className="h-8 w-8 px-0"
        >
          ◆
        </Button>
      </div>
    </div>
  );
};
