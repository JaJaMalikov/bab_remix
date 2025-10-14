import React from 'react';
import { AnimationProperty } from '../../context/AnimationContext';

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
    <div className="property-group">
      <h4>Member Transform</h4>
      <div className="property">
        <label>Rotation</label>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="number"
            value={Math.round(angle)}
            onChange={(e) => onAngleChange(parseFloat(e.target.value) || 0)}
            style={{ width: 80 }}
          />
          <button
            onClick={() => onAddKeyframe('rotation', angle)}
            title="Add keyframe"
            style={{
              padding: '4px 8px',
              background: hasKeyframe('rotation') ? '#5a9fd4' : '#3a3a3a',
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
      <div className="property">
        <input
          type="range"
          min="-180"
          max="180"
          value={angle}
          onChange={(e) => onAngleChange(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};
