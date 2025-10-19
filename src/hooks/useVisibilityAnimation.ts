import { useEffect } from "react";
import { useAnimation } from "../context/AnimationContext";
import { useUi } from "../context/UiContext";

export const useVisibilityAnimation = () => {
  const { currentFrame, getValueAtFrame, tracks } = useAnimation();
  const { sceneItems } = useUi();

  useEffect(() => {
    const itemVisibility = new Map<string, boolean>();

    tracks.forEach((track) => {
      if (track.property === "visible" && track.targetMemberId === null) {
        const value = getValueAtFrame(track.targetId, null, "visible", currentFrame);
        if (value !== null) {
          itemVisibility.set(track.targetId, Boolean(value));
        }
      }
    });

    sceneItems.forEach((item) => {
      const el = item.el as SVGGraphicsElement;
      const visible = itemVisibility.has(item.id) ? itemVisibility.get(item.id)! : !itemVisibility.size;

      el.setAttribute("data-visibility-state", visible ? "visible" : "hidden");
      if (visible) {
        el.removeAttribute("display");
        el.style.display = "";
      } else {
        el.setAttribute("display", "none");
        el.style.display = "none";
      }
    });
  }, [currentFrame, tracks, sceneItems, getValueAtFrame]);
};
