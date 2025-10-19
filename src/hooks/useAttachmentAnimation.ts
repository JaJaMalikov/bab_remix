import { useEffect, useCallback } from "react";
import { useAnimation } from "../context/AnimationContext";
import { SceneItem, useUi } from "../context/UiContext";
import { findVisibleVariant } from "../utils/svgVariants";
import {
  embedAttachmentIntoMember,
  releaseAttachmentFromMember,
} from "../utils/attachment";

export const useAttachmentAnimation = () => {
  const { currentFrame, getValueAtFrame, tracks } = useAnimation();
  const { sceneItems } = useUi();

  const clearAttachmentAttributes = useCallback((imageEl: SVGGraphicsElement) => {
    if (imageEl.getAttribute("data-attached-mode") === "embedded") {
      releaseAttachmentFromMember(imageEl);
    }
    imageEl.removeAttribute("data-attached-to-puppet");
    imageEl.removeAttribute("data-attached-to-member");
    imageEl.removeAttribute("data-attachment-offset-cx");
    imageEl.removeAttribute("data-attachment-offset-cy");
  }, []);

  useEffect(() => {
    const puppets = new Map<string, { anchor: SVGGElement; item: SceneItem }>();
    sceneItems.forEach((item) => {
      if (item.type === "puppet") {
        puppets.set(item.id, { anchor: item.el as SVGGElement, item });
      }
    });

    tracks.forEach(track => {
      if (track.property === 'attachment') {
        const value = getValueAtFrame(track.targetId, null, 'attachment', currentFrame);
        const item = sceneItems.find(i => i.id === track.targetId);

        if (item && item.type === 'image') {
          const imageEl = item.el as SVGGraphicsElement;
          if (typeof value !== 'string' || !value.includes(':')) {
            clearAttachmentAttributes(imageEl);
          } else {
            const [puppetId, memberId] = value.split(':');
            const puppetEntry = puppets.get(puppetId);
            if (puppetEntry) {
              const puppetRoot = puppetEntry.anchor.firstChild as SVGGElement | null;
              const member = puppetRoot ? findVisibleVariant(puppetRoot, memberId) : null;
              if (member) {
                const currentPuppet = imageEl.getAttribute('data-attached-to-puppet');
                const currentMember = imageEl.getAttribute('data-attached-to-member');
                if (currentPuppet !== puppetId || currentMember !== memberId) {
                  if (imageEl.getAttribute("data-attached-mode") === "embedded") releaseAttachmentFromMember(imageEl);
                  const embedded = embedAttachmentIntoMember({ element: imageEl, member, anchor: puppetEntry.anchor });
                  if (embedded) {
                    imageEl.setAttribute('data-attached-to-puppet', puppetId);
                    imageEl.setAttribute('data-attached-to-member', memberId);
                    imageEl.removeAttribute('data-attachment-offset-cx');
                    imageEl.removeAttribute('data-attachment-offset-cy');
                  }
                }
              }
            }
          }
        }
      }
    });
  }, [currentFrame, tracks, sceneItems, getValueAtFrame, clearAttachmentAttributes]);
};
