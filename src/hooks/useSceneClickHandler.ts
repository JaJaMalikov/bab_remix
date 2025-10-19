import React, { useCallback } from "react";
import type { SceneItem } from "../context/UiContext";
import { getRotationFromTransform } from "../utils/svgTransform";

interface ClickHandlerArgs {
  dragMovedRef: React.MutableRefObject<boolean>;
  sceneItems: SceneItem[];
  setSelectedItemId: (id: string | null) => void;
  setUiSelectedPuppet: (puppet: SVGGElement | null) => void;
  setUiSelectedLimb: (limbId: string) => void;
  setUiAngle: (angle: number) => void;
  setShowInspector: (value: React.SetStateAction<boolean>) => void;
  setShowLibrary: (value: React.SetStateAction<boolean>) => void;
  setShowLayers: (value: React.SetStateAction<boolean>) => void;
}

const getLimbRotationFromDom = (g: SVGGElement): number => {
  return getRotationFromTransform(g);
};

export const useSceneClickHandler = ({
  dragMovedRef,
  sceneItems,
  setSelectedItemId,
  setUiSelectedPuppet,
  setUiSelectedLimb,
  setUiAngle,
  setShowInspector,
  setShowLibrary,
  setShowLayers,
}: ClickHandlerArgs) => {
  const onClick = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return; // ignore right/middle click
      if (dragMovedRef.current) {
        dragMovedRef.current = false;
        return;
      }

      // Check if clicked on a puppet (anchor or its content)
      const puppetAnchor = (e.target as Element)?.closest(
        '[data-anchor="puppet"]',
      ) as SVGGElement | null;
      if (puppetAnchor) {
        const puppetItem = sceneItems.find((item) => item.el === puppetAnchor);
        if (puppetItem) {
          setSelectedItemId(puppetItem.id);
          setShowInspector(true);
          setShowLibrary(false);
          setShowLayers(false);
        }

        // Only select a member if specifically clicking on one (not the background)
        const limb = (e.target as Element)?.closest(
          "[data-membre]",
        ) as SVGGElement | null;
        if (limb?.id) {
          const puppetRoot = puppetAnchor.firstChild as SVGGElement | null;
          if (puppetRoot) {
            setUiSelectedPuppet(puppetRoot);
            setUiSelectedLimb(limb.id);
            const a = getLimbRotationFromDom(limb);
            setUiAngle(Math.round(a));
          }
        } else {
          setUiSelectedLimb("");
        }
        return;
      }

      // Check if clicked on an image
      const img = (e.target as Element)?.closest(
        '[data-draggable="true"]',
      ) as SVGGraphicsElement | null;
      if (img) {
        const imgId = img.getAttribute("data-id");
        if (imgId) {
          setSelectedItemId(imgId);
          setUiSelectedLimb("");
          setShowInspector(true);
          setShowLibrary(false);
          setShowLayers(false);
        }
        return;
      }

      // Clicked on empty space - deselect all
      setSelectedItemId(null);
      setUiSelectedLimb("");
    },
    [
      dragMovedRef,
      sceneItems,
      setSelectedItemId,
      setShowInspector,
      setShowLibrary,
      setShowLayers,
      setUiAngle,
      setUiSelectedLimb,
      setUiSelectedPuppet,
    ],
  );

  return { onClick };
};
