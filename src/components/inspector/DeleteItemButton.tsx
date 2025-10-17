import React from "react";

interface DeleteItemButtonProps {
  onClick: () => void;
}

export const DeleteItemButton: React.FC<DeleteItemButtonProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded border border-destructive bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
    >
      Delete Item
    </button>
  );
};
