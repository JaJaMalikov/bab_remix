import React from 'react';

interface DeleteItemButtonProps {
  onClick: () => void;
}

export const DeleteItemButton: React.FC<DeleteItemButtonProps> = ({ onClick }) => {
  return (
    <div className="property-group">
      <button
        onClick={onClick}
        style={{
          width: '100%',
          padding: 8,
          background: '#ff6b6b',
          border: 'none',
          borderRadius: 4,
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Delete Item
      </button>
    </div>
  );
};
