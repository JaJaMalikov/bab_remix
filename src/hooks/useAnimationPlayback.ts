import { useEffect, useState } from 'react';
import { useAnimation } from '../context/AnimationContext';
import { useUi } from '../context/UiContext';
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

    // Group tracks by target to apply numeric transforms at once
    const targetTransforms = new Map<string, Map<string, Record<string, number>>>();

    tracks.forEach((track) => {
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
        const numericValue = typeof value === 'string' ? parseFloat(value) : value;
        if (!isNaN(numericValue)) {
          transforms[track.property] = numericValue as number;
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

    // Finally, update positions of images attached to puppet members (follow mode)
    sceneItems.forEach((item) => {
      if (item.type !== 'image') return;
      const el = item.el as SVGImageElement;
      const puppetId = el.getAttribute('data-attached-to-puppet');
      const memberId = el.getAttribute('data-attached-to-member');
      const offCx = el.getAttribute('data-attachment-offset-cx');
      const offCy = el.getAttribute('data-attachment-offset-cy');
      if (!puppetId || !memberId || offCx === null || offCy === null) return;

      const puppet = sceneItems.find((i) => i.id === puppetId);
      if (!puppet || puppet.type !== 'puppet') return;

      const puppetAnchor = puppet.el as SVGGElement;
      const puppetRoot = puppetAnchor.firstChild as SVGGElement | null;
      if (!puppetRoot) return;

      let member = puppetRoot.querySelector(`#${CSS.escape(memberId)}`) as SVGGElement | null;
      if (!member) return;

      // If base member is hidden due to variants, find the visible variant targeting this group
      if (member.style.display === 'none' || member.getAttribute('display') === 'none') {
        const visibleVariant = findVisibleVariant(puppetRoot, memberId);
        if (visibleVariant) member = visibleVariant;
      }

      const svg = el.ownerSVGElement;
      if (!svg) return;
      const viewport = svg.querySelector('[data-viewport]') as SVGGElement | null;
      if (!viewport) return;

      const memberMatrix = member.getScreenCTM();
      const viewportMatrix = viewport.getScreenCTM();
      if (!memberMatrix || !viewportMatrix) return;

      // member local to viewport matrix
      const viewportInverse = viewportMatrix.inverse();
      const memberLocalToViewport = viewportInverse.multiply(memberMatrix);

      const localPoint = svg.createSVGPoint();
      localPoint.x = parseFloat(offCx);
      localPoint.y = parseFloat(offCy);
      const scenePoint = localPoint.matrixTransform(memberLocalToViewport);

      const imgW = parseFloat(el.getAttribute('width') || '0');
      const imgH = parseFloat(el.getAttribute('height') || '0');
      const sceneX = scenePoint.x - imgW / 2;
      const sceneY = scenePoint.y - imgH / 2;

      el.setAttribute('x', String(Math.round(sceneX)));
      el.setAttribute('y', String(Math.round(sceneY)));

      // Apply member rotation to image
      const angle = Math.atan2(memberLocalToViewport.b, memberLocalToViewport.a) * (180 / Math.PI);
      const cx = sceneX + imgW / 2;
      const cy = sceneY + imgH / 2;
      el.setAttribute('transform', `rotate(${angle} ${cx} ${cy})`);
    });
  }, [currentFrame, tracks, sceneItems, getValueAtFrame, refreshTrigger]);
};
