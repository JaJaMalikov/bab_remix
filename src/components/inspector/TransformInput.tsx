import React from 'react';

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
    <div className="property">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          type="number"
          step={step}
          value={displayValue}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{ width: 80 }}
        />
        <button
          onClick={onAddKeyframe}
          title="Add keyframe"
          style={{
            padding: '4px 8px',
            background: hasKeyframe ? '#5a9fd4' : '#3a3a3a',
            border: 'none',
            borderRadius: 4,
            color: '#fff',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          ◆
        </button>
      </div>
    </div>
  );
};
