import { useEffect } from "react";

/**
 * Enregistre des écouteurs de glisser globaux sur la fenêtre pendant une opération active.
 * @param isActive Indique si le glisser est en cours.
 * @param onMove Callback déclenché à chaque mouvement de souris.
 * @param onUp Callback déclenché à la fin du glisser.
 */
export const useWindowDrag = (
  isActive: boolean,
  onMove: (event: MouseEvent) => void,
  onUp: (event: MouseEvent) => void,
) => {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      onMove(event);
    };

    const handleMouseUp = (event: MouseEvent) => {
      onUp(event);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isActive, onMove, onUp]);
};
