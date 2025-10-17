import { Button } from "../ui/button";
import React from "react";

interface DeleteItemButtonProps {
  onClick: () => void;
}

export const DeleteItemButton: React.FC<DeleteItemButtonProps> = ({ onClick }) => {
  return (
    <section>
      <Button
        type="button"
        onClick={onClick}
        variant="destructive"
        className="w-full"
      >
        Delete Item
      </Button>
    </section>
  );
};
