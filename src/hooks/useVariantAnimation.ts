import { useEffect } from "react";
import { useAnimation } from "../context/AnimationContext";
import { useUi } from "../context/UiContext";
import { applyVariantSelection } from "../utils/svgVariants";

export const useVariantAnimation = () => {
  const { currentFrame, getValueAtFrame, tracks } = useAnimation();
  const { sceneItems } = useUi();

  useEffect(() => {
    tracks.forEach(track => {
      if (track.property === 'activeVariant') {
        const value = getValueAtFrame(track.targetId, track.targetMemberId, 'activeVariant', currentFrame);
        if (typeof value === 'string') {
          const item = sceneItems.find(i => i.id === track.targetId);
          if (item && item.type === 'puppet') {
            const puppetRoot = item.el.firstChild as SVGGElement | null;
            if (puppetRoot) {
              const group = item.metadata?.variantGroups.find(g => g.group === track.targetMemberId);
              if (group) {
                applyVariantSelection(puppetRoot, group, value);
              }
            }
          }
        }
      }
    });
  }, [currentFrame, tracks, sceneItems, getValueAtFrame]);
};
