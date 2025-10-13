import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAnimation } from '../context/AnimationContext';
import { useUi } from '../context/UiContext';
import type { SceneItem } from '../context/UiContext';
import { setRotationWithOrigin, setImageTransform } from '../utils/svgTransform';
import { applyVariantSelection, findVisibleVariant } from '../utils/svgVariants';

/**
 * Hook that applies animation values to scene elements during playback
 */
export const useAnimationPlayback = () => {
  const { currentFrame, getValueAtFrame, tracks } = useAnimation();
  const { sceneItems } = useUi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen for manual refresh requests
  useEffect(() => {
    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener("animation:refresh", handleRefresh);
    return () => window.removeEventListener("animation:refresh", handleRefresh);
  }, []);

  const { attachmentEntries, puppetAnchors } = useMemo(() => {
    const attachments: Array<{
      item: SceneItem;
      image: SVGImageElement;
      puppetId: string;
      memberId: string;
      offset: { cx: number; cy: number };
    }> = [];
    const puppets = new Map<string, { anchor: SVGGElement; item: SceneItem }>();

    sceneItems.forEach((item) => {
      if (item.type === 'puppet') {
        const anchor = item.el as SVGGElement;
        puppets.set(item.id, { anchor, item });
        return;
      }

      if (item.type !== 'image') {
        return;
      }

      const image = item.el as SVGImageElement;
      const puppetId = image.getAttribute('data-attached-to-puppet');
      const memberId = image.getAttribute('data-attached-to-member');
      const offCx = image.getAttribute('data-attachment-offset-cx');
      const offCy = image.getAttribute('data-attachment-offset-cy');

      if (!puppetId || !memberId || offCx === null || offCy === null) {
        return;
      }

      const offset = { cx: parseFloat(offCx), cy: parseFloat(offCy) };
      attachments.push({ item, image, puppetId, memberId, offset });
    });

    return { attachmentEntries: attachments, puppetAnchors: puppets };
  }, [sceneItems]);

  const updateAttachments = useCallback(
    (puppetFilter?: Set<string>) => {
      attachmentEntries.forEach(({ image, puppetId, memberId, offset }) => {
        if (puppetFilter && !puppetFilter.has(puppetId)) return;

        const visibilityState = image.getAttribute('data-visibility-state');
        const isVisibleByTrack = visibilityState !== 'hidden';
        if (!isVisibleByTrack) {
          image.setAttribute('display', 'none');
          image.style.display = 'none';
          return;
        }

        const puppetEntry = puppetAnchors.get(puppetId);
        if (!puppetEntry) return;

        const { anchor } = puppetEntry;
        const puppetDisplayAttr = anchor.getAttribute('display');
        const puppetStyleDisplay = anchor.style.display || '';
        if (puppetDisplayAttr === 'none' || puppetStyleDisplay === 'none') {
          image.setAttribute('display', 'none');
          image.style.display = 'none';
          return;
        }

        const puppetRoot = anchor.firstChild as SVGGElement | null;
        if (!puppetRoot) return;

        let member = puppetRoot.querySelector(`#${CSS.escape(memberId)}`) as SVGGElement | null;
        if (!member) return;

        if (member.style.display === 'none' || member.getAttribute('display') === 'none') {
          const visibleVariant = findVisibleVariant(puppetRoot, memberId);
          if (visibleVariant) member = visibleVariant;
        }

        const svg = image.ownerSVGElement;
        if (!svg) return;
        const viewport = svg.querySelector('[data-viewport]') as SVGGElement | null;
        if (!viewport) return;

        const memberMatrix = member.getScreenCTM();
        const viewportMatrix = viewport.getScreenCTM();
        if (!memberMatrix || !viewportMatrix) return;

        const viewportInverse = viewportMatrix.inverse();
        const memberLocalToViewport = viewportInverse.multiply(memberMatrix);

        const localPoint = svg.createSVGPoint();
        localPoint.x = offset.cx;
        localPoint.y = offset.cy;
        const scenePoint = localPoint.matrixTransform(memberLocalToViewport);

        const imgW = parseFloat(image.getAttribute('width') || '0');
        const imgH = parseFloat(image.getAttribute('height') || '0');
        const sceneX = scenePoint.x - imgW / 2;
        const sceneY = scenePoint.y - imgH / 2;

        image.setAttribute('x', String(Math.round(sceneX)));
        image.setAttribute('y', String(Math.round(sceneY)));

        const angle = Math.atan2(memberLocalToViewport.b, memberLocalToViewport.a) * (180 / Math.PI);
        const cx = sceneX + imgW / 2;
        const cy = sceneY + imgH / 2;
        image.setAttribute('transform', `rotate(${angle} ${cx} ${cy})`);
        image.removeAttribute('display');
        image.style.display = '';
      });
    },
    [attachmentEntries, puppetAnchors],
  );

  useEffect(() => {
    // First, apply non-numeric properties like variants before transforms
    tracks.forEach((track) => {
      if (track.property !== 'activeVariant') return;
      const value = getValueAtFrame(track.targetId, track.targetMemberId, track.property, currentFrame);
      if (!value || typeof value !== 'string') return;

      const item = sceneItems.find((i) => i.id === track.targetId);
      if (!item || item.type !== 'puppet') return;

      const anchor = item.el;
      const puppetRoot = anchor.firstChild as SVGGElement | null;
      if (!puppetRoot) return;

      const groupName = track.targetMemberId; // we store group name in targetMemberId for variants
      const group = item.metadata?.variantGroups.find((g) => g.group === groupName);
      // Fallback: if no metadata group, operate on DOM by attribute
      if (!group) {
        if (!groupName) return;
        const variants = Array.from(
          puppetRoot.querySelectorAll(`[data-variant-groupe="${CSS.escape(groupName)}"]`)
        ) as SVGElement[];
        variants.forEach((el) => {
          if (el.id === value) {
            el.style.display = '';
            el.removeAttribute('display');
          } else {
            el.style.display = 'none';
          }
        });
        return;
      }

      // Get target member for this variant group
      applyVariantSelection(puppetRoot, group, value);
    });

    const itemVisibility = new Map<string, boolean>();
    tracks.forEach((track) => {
      if (track.property !== 'visible' || track.targetMemberId !== null) return;
      const rawValue = getValueAtFrame(track.targetId, track.targetMemberId, track.property, currentFrame);
      if (rawValue === null) return;
      itemVisibility.set(track.targetId, Boolean(rawValue));
    });

    // Group tracks by target to apply numeric transforms at once
    const targetTransforms = new Map<string, Map<string, Record<string, number>>>();

    tracks.forEach((track) => {
      if (track.property === 'visible') return;
      const value = getValueAtFrame(track.targetId, track.targetMemberId, track.property, currentFrame);
      if (value === null) return;

      const targetKey = `${track.targetId}:${track.targetMemberId || 'null'}`;
      if (!targetTransforms.has(targetKey)) {
        targetTransforms.set(targetKey, new Map());
      }

      const targetMap = targetTransforms.get(targetKey)!;
      if (!targetMap.has(track.targetId)) {
        targetMap.set(track.targetId, {});
      }

      const transforms = targetMap.get(track.targetId)!;
      // Only apply numeric properties here
      if (
        track.property === 'x' ||
        track.property === 'y' ||
        track.property === 'rotation' ||
        track.property === 'scaleX' ||
        track.property === 'scaleY'
      ) {
        let numericValue: number | null = null;
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) {
            numericValue = parsed;
          }
        } else if (typeof value === 'number') {
          numericValue = value;
        }
        if (numericValue !== null) {
          transforms[track.property] = numericValue;
        }
      }
    });

    // Apply grouped transforms
    targetTransforms.forEach((targetMap, targetKey) => {
      const [targetId, memberIdStr] = targetKey.split(':');
      const memberId = memberIdStr === 'null' ? null : memberIdStr;
      const item = sceneItems.find((i) => i.id === targetId);
      if (!item) return;

      targetMap.forEach((transforms, _targetId) => {
        const el = item.el;

        // Apply to puppet member
        if (memberId && item.type === 'puppet') {
          const anchor = el;
          const puppetRoot = anchor.firstChild as SVGGElement | null;
          if (puppetRoot) {
            const memberEl = puppetRoot.querySelector(`#${CSS.escape(memberId)}`) as SVGGElement | null;
            if (memberEl && transforms.rotation !== undefined) {
              setRotationWithOrigin(memberEl, transforms.rotation);
            }
          }
        }
        // Apply to whole item
        else if (!memberId) {
          if (item.type === 'puppet') {
            // Puppet position - get current or default
            const transformAttr = el.getAttribute('transform') || '';
            const match = transformAttr.match(/translate\(([-\d.]+)[,\s]+([-\d.]+)\)/);
            let x = match ? parseFloat(match[1] || '0') : 0;
            let y = match ? parseFloat(match[2] || '0') : 0;

            // Update with animated values if present
            if (transforms.x !== undefined) x = transforms.x;
            if (transforms.y !== undefined) y = transforms.y;

            el.setAttribute('transform', `translate(${x}, ${y})`);
          } else {
            // Image - get current attributes
            const imgEl = el as SVGImageElement;
            let x = parseFloat(imgEl.getAttribute('x') || '0');
            let y = parseFloat(imgEl.getAttribute('y') || '0');

            // Update position with animated values if present
            if (transforms.x !== undefined) x = transforms.x;
            if (transforms.y !== undefined) y = transforms.y;

            imgEl.setAttribute('x', String(x));
            imgEl.setAttribute('y', String(y));

            // Get current transform values
            const transformAttr = imgEl.getAttribute('transform') || '';
            const rotMatch = transformAttr.match(/rotate\(([-\d.]+)/);
            const scaleMatch = transformAttr.match(/scale\(([-\d.]+)(?:[,\s]+([-\d.]+))?\)/);

            let rotation = rotMatch ? parseFloat(rotMatch[1] || '0') : 0;
            let scaleX = scaleMatch ? parseFloat(scaleMatch[1] || '1') : 1;
            let scaleY = scaleMatch && scaleMatch[2] ? parseFloat(scaleMatch[2]) : scaleX;

            // Update with animated values if present
            if (transforms.rotation !== undefined) rotation = transforms.rotation;
            if (transforms.scaleX !== undefined) scaleX = transforms.scaleX;
            if (transforms.scaleY !== undefined) scaleY = transforms.scaleY;

            setImageTransform(imgEl, rotation, scaleX, scaleY);
          }
        }
      });
    });

    sceneItems.forEach((item) => {
      const el = item.el as SVGGraphicsElement;
      const visible = itemVisibility.has(item.id) ? itemVisibility.get(item.id)! : true;
      if (visible) {
        el.removeAttribute('display');
        el.style.display = '';
        el.setAttribute('data-visibility-state', 'visible');
      } else {
        el.setAttribute('display', 'none');
        el.style.display = 'none';
        el.setAttribute('data-visibility-state', 'hidden');
      }
    });

    // Finally, update positions of images attached to puppet members (follow mode)
    updateAttachments();
  }, [currentFrame, tracks, sceneItems, getValueAtFrame, refreshTrigger, updateAttachments]);

  useEffect(() => {
    const handleAttachmentUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ anchor?: SVGGElement; puppetId?: string }>).detail;
      if (detail?.anchor) {
        const puppet = sceneItems.find((item) => item.el === detail.anchor);
        if (puppet) {
          updateAttachments(new Set([puppet.id]));
        }
        return;
      }
      if (detail?.puppetId) {
        updateAttachments(new Set([detail.puppetId]));
        return;
      }
      updateAttachments();
    };
    window.addEventListener('attachment:update', handleAttachmentUpdate);
    return () => window.removeEventListener('attachment:update', handleAttachmentUpdate);
  }, [sceneItems, updateAttachments]);
};
