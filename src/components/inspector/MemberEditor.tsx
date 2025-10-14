import React from 'react';

interface MemberEditorProps {
  limbList: { id: string; name: string }[];
  selectedLimb: string | null;
  onSelectLimb: (limbId: string) => void;
}

export const MemberEditor: React.FC<MemberEditorProps> = ({
  limbList,
  selectedLimb,
  onSelectLimb,
}) => {
  if (limbList.length === 0) return null;

  return (
    <div className="property-group">
      <h4>Members ({limbList.length})</h4>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          maxHeight: 150,
          overflowY: 'auto',
        }}
      >
        {limbList.map((limb) => (
          <button
            key={limb.id}
            onClick={() => onSelectLimb(limb.id)}
            style={{
              padding: '6px 8px',
              background: limb.id === selectedLimb ? '#5a9fd4' : '#1e1e1e',
              border: '1px solid #3a3a3a',
              borderRadius: 4,
              color: limb.id === selectedLimb ? '#fff' : '#e0e0e0',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 11,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{limb.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
