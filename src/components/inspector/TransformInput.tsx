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
    <div className="flex items-center justify-between gap-2">
      <label className="text-[10px] font-medium uppercase text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step={step}
          value={displayValue}
          onChange={(event) =>
            onChange(parseFloat(event.target.value || "0") || 0)
          }
          className="h-6 w-20 text-right text-xs"
        />
        <button
          type="button"
          onClick={onAddKeyframe}
          title="Add keyframe"
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs ${hasKeyframe ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/40 text-muted-foreground hover:border-primary/60"}`}
        >
          ◆
        </button>
      </div>
    </div>
  );
};
