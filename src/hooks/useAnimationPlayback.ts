import { useEffect, useState, useCallback, useMemo } from "react";
import { useAnimation } from "../context/AnimationContext";
import { useUi } from "../context/UiContext";
import type { SceneItem } from "../context/UiContext";

import {
  setRotationWithOrigin,
  setImageTransform,
  parseTransformAttribute,
} from "../utils/svgTransform";
import {
  applyVariantSelection,
  findVisibleVariant,
} from "../utils/svgVariants";
import {
  embedAttachmentIntoMember,
  ensureEmbeddedAttachment,
  releaseAttachmentFromMember,
} from "../utils/attachment";
import { parseNumber } from "../utils/numbers";

const useRefresh = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  useEffect(() => {
    const handleRefresh = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener("animation:refresh", handleRefresh);
    return () => window.removeEventListener("animation:refresh", handleRefresh);
  }, []);
  return refreshTrigger;
};

const usePuppetAndAttachmentData = (sceneItems: SceneItem[], refreshTrigger: number) => {
  const findMemberOrVariant = useCallback(
    (puppetRoot: SVGGElement, memberId: string): SVGGElement | null => {
      const member = puppetRoot.querySelector(`#${CSS.escape(memberId)}`) as SVGGElement | null;
      if (!member) return null;
      if (member.style.display === "none" || member.getAttribute("display") === "none") {
        const visibleVariant = findVisibleVariant(puppetRoot, memberId);
        if (visibleVariant) return visibleVariant;
      }
      return member;
    },
    [],
  );

  const processEmbeddedAttachment = useCallback(
    (image: SVGGraphicsElement, puppetId: string, memberId: string, puppets: Map<string, { anchor: SVGGElement; item: SceneItem }>) => {
      const puppetEntry = puppets.get(puppetId);
      if (!puppetEntry) return;
      const puppetRoot = puppetEntry.anchor.firstChild as SVGGElement | null;
      if (!puppetRoot) return;
      const member = findMemberOrVariant(puppetRoot, memberId);
      if (member) {
        ensureEmbeddedAttachment({ element: image, member });
      }
    },
    [findMemberOrVariant],
  );

  return useMemo(() => {
    const attachments: Array<{ item: SceneItem; image: SVGGraphicsElement; puppetId: string; memberId: string; offset: { cx: number; cy: number } }> = [];
    const puppets = new Map<string, { anchor: SVGGElement; item: SceneItem }>();

    sceneItems.forEach((item) => {
      if (item.type === "puppet") {
        puppets.set(item.id, { anchor: item.el as SVGGElement, item });
        return;
      }
      if (item.type !== "image") return;

      const image = item.el as SVGGraphicsElement;
      const puppetId = image.getAttribute("data-attached-to-puppet");
      const memberId = image.getAttribute("data-attached-to-member");

      if (!puppetId || !memberId) return;

      const mode = image.getAttribute("data-attached-mode");
      if (mode === "embedded") {
        processEmbeddedAttachment(image, puppetId, memberId, puppets);
        return;
      }

      const offCx = image.getAttribute("data-attachment-offset-cx");
      const offCy = image.getAttribute("data-attachment-offset-cy");
      if (offCx === null || offCy === null) return;

      attachments.push({ item, image, puppetId, memberId, offset: { cx: parseFloat(offCx), cy: parseFloat(offCy) } });
    });

    return { attachmentEntries: attachments, puppetAnchors: puppets, findMemberOrVariant };
  }, [sceneItems, refreshTrigger, processEmbeddedAttachment]);
};

export const useAnimationPlayback = () => {
  const { currentFrame, getValueAtFrame, tracks } = useAnimation();
  const { sceneItems } = useUi();
  const refreshTrigger = useRefresh();
  const { attachmentEntries, puppetAnchors, findMemberOrVariant } = usePuppetAndAttachmentData(sceneItems, refreshTrigger);

  const clearAttachmentAttributes = useCallback((imageEl: SVGGraphicsElement) => {
    if (imageEl.getAttribute("data-attached-mode") === "embedded") {
      releaseAttachmentFromMember(imageEl);
    }
    imageEl.removeAttribute("data-attached-to-puppet");
    imageEl.removeAttribute("data-attached-to-member");
    imageEl.removeAttribute("data-attachment-offset-cx");
    imageEl.removeAttribute("data-attachment-offset-cy");
  }, []);

  const updateAttachments = useCallback((puppetFilter?: Set<string>) => {
    attachmentEntries.forEach(({ image, puppetId, memberId, offset }) => {
      if ((puppetFilter && !puppetFilter.has(puppetId)) || image.getAttribute("data-visibility-state") === "hidden") {
        image.setAttribute("display", "none");
        image.style.display = "none";
        return;
      }

      const puppetEntry = puppetAnchors.get(puppetId);
      if (!puppetEntry) return;

      const { anchor } = puppetEntry;
      if (anchor.getAttribute("display") === "none" || anchor.style.display === "none") {
        image.setAttribute("display", "none");
        image.style.display = "none";
        return;
      }

      const puppetRoot = anchor.firstChild as SVGGElement | null;
      if (!puppetRoot) return;

      let member = puppetRoot.querySelector(`#${CSS.escape(memberId)}`) as SVGGElement | null;
      if (!member) return;

      if (member.style.display === "none" || member.getAttribute("display") === "none") {
        const visibleVariant = findVisibleVariant(puppetRoot, memberId);
        if (visibleVariant) member = visibleVariant;
      }

      const svg = image.ownerSVGElement;
      const viewport = svg?.querySelector("[data-viewport]") as SVGGElement | null;
      if (!svg || !viewport) return;

      const memberMatrix = member.getScreenCTM();
      const viewportMatrix = viewport.getScreenCTM();
      if (!memberMatrix || !viewportMatrix) return;

      const scenePoint = svg.createSVGPoint();
      scenePoint.x = offset.cx;
      scenePoint.y = offset.cy;
      const memberLocalToViewport = viewportMatrix.inverse().multiply(memberMatrix);
      const finalPoint = scenePoint.matrixTransform(memberLocalToViewport);

      const imgW = parseFloat(image.getAttribute('width') || '0');
      const imgH = parseFloat(image.getAttribute('height') || '0');
      image.setAttribute('x', String(Math.round(finalPoint.x - imgW / 2)));
      image.setAttribute('y', String(Math.round(finalPoint.y - imgH / 2)));

      const angle = Math.atan2(memberLocalToViewport.b, memberLocalToViewport.a) * (180 / Math.PI);
      image.setAttribute('transform', `rotate(${angle} ${finalPoint.x} ${finalPoint.y})`);
      image.removeAttribute("display");
      image.style.display = "";
    });
  }, [attachmentEntries, puppetAnchors]);

  useEffect(() => {
    const itemVisibility = new Map<string, boolean>();
    const targetTransforms = new Map<string, Record<string, number>>();

    // 1. Apply non-numeric and gather numeric transforms
    tracks.forEach(track => {
      const value = getValueAtFrame(track.targetId, track.targetMemberId, track.property, currentFrame);
      if (value === null) return;

      const item = sceneItems.find(i => i.id === track.targetId);
      if (!item) return;

      switch (track.property) {
        case 'activeVariant': {
          if (item.type === 'puppet' && typeof value === 'string') {
            const puppetRoot = item.el.firstChild as SVGGElement | null;
            if (puppetRoot) {
              const group = item.metadata?.variantGroups.find(g => g.group === track.targetMemberId);
              if (group) {
                applyVariantSelection(puppetRoot, group, value);
              }
            }
          }
          break;
        }
        case 'attachment': {
          if (item.type === 'image') {
            const imageEl = item.el as SVGGraphicsElement;
            if (typeof value !== 'string' || !value.includes(':')) {
              clearAttachmentAttributes(imageEl);
            } else {
              const [puppetId, memberId] = value.split(':');
              const puppetEntry = puppetAnchors.get(puppetId);
              if (puppetEntry) {
                const puppetRoot = puppetEntry.anchor.firstChild as SVGGElement | null;
                const member = puppetRoot ? findMemberOrVariant(puppetRoot, memberId) : null;
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
          break;
        }
        case 'visible':
          if (track.targetMemberId === null) {
            itemVisibility.set(track.targetId, Boolean(value));
          }
          break;
        case 'x':
        case 'y':
        case 'rotation':
        case 'scaleX':
        case 'scaleY': {
          const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
          if (!isNaN(numericValue)) {
            const targetKey = `${track.targetId}:${track.targetMemberId || 'null'}`;
            const existing = targetTransforms.get(targetKey) || {};
            existing[track.property] = numericValue;
            targetTransforms.set(targetKey, existing);
          }
          break;
        }
      }
    });

    // 2. Apply numeric transforms
    targetTransforms.forEach((transforms, targetKey) => {
      const [targetId, memberIdStr] = targetKey.split(':');
      const memberId = memberIdStr === 'null' ? null : memberIdStr;
      const item = sceneItems.find(i => i.id === targetId);
      if (!item) return;

      if (memberId && item.type === 'puppet') {
        const puppetRoot = item.el.firstChild as SVGGElement | null;
        if (puppetRoot) {
          const memberEl = puppetRoot.querySelector(`#${CSS.escape(memberId)}`) as SVGGElement | null;
          if (memberEl && transforms.rotation !== undefined) {
            setRotationWithOrigin(memberEl, transforms.rotation);
          }
        }
      } else if (!memberId) {
        if (item.type === 'puppet') {
          const parsed = parseTransformAttribute(item.el);
          const x = transforms.x ?? parsed.translate?.x ?? 0;
          const y = transforms.y ?? parsed.translate?.y ?? 0;
          item.el.setAttribute('transform', `translate(${x}, ${y})`);
        } else {
          const imgEl = item.el as SVGGraphicsElement;
          const x = transforms.x ?? parseNumber(imgEl.getAttribute('x'), 0);
          const y = transforms.y ?? parseNumber(imgEl.getAttribute('y'), 0);
          imgEl.setAttribute('x', String(x));
          imgEl.setAttribute('y', String(y));

          const parsed = parseTransformAttribute(imgEl);
          const rotation = transforms.rotation ?? parsed.rotate ?? 0;
          const scaleX = transforms.scaleX ?? parsed.scale?.x ?? 1;
          const scaleY = transforms.scaleY ?? parsed.scale?.y ?? 1;
          setImageTransform(imgEl, rotation, scaleX, scaleY);
        }
      }
    });

    // 3. Apply visibility
    sceneItems.forEach(item => {
      const el = item.el as SVGGraphicsElement;
      const visible = itemVisibility.has(item.id) ? itemVisibility.get(item.id)! : true;
      el.setAttribute('data-visibility-state', visible ? 'visible' : 'hidden');
      if (visible) {
        el.removeAttribute('display');
        el.style.display = '';
      } else {
        el.setAttribute('display', 'none');
        el.style.display = 'none';
      }
    });

    // 4. Update attachments
    updateAttachments();

  }, [currentFrame, tracks, sceneItems, getValueAtFrame, refreshTrigger, updateAttachments, clearAttachmentAttributes, puppetAnchors, findMemberOrVariant]);

  useEffect(() => {
    const handleAttachmentUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ anchor?: SVGGElement; puppetId?: string }>).detail;
      updateAttachments(detail?.puppetId ? new Set([detail.puppetId]) : undefined);
    };
    window.addEventListener("attachment:update", handleAttachmentUpdate);
    return () => window.removeEventListener("attachment:update", handleAttachmentUpdate);
  }, [updateAttachments]);
};
