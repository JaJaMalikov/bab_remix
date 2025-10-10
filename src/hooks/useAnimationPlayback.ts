import { useEffect, useState } from 'react';
import { useAnimation } from '../context/AnimationContext';
import { useUi } from '../context/UiContext';

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

      // We keep DOM natural order for normal cases.
      // When a variant declares isBehindParent=true, we move it to the beginning of the target member's parent.

      // Resolve target member once from the active variant (if any)
      const activeInfo = group.variants.find((vv: any) => vv.id === value);
      const targetMember = activeInfo?.targetMemberId
        ? (puppetRoot.querySelector(`#${CSS.escape(activeInfo.targetMemberId)}`) as SVGElement | null)
        : null;

      group.variants.forEach((v: any) => {
        const el = puppetRoot.querySelector(`#${CSS.escape(v.id)}`) as SVGElement | null;
        if (!el) return;

        if (v.id === value) {
          el.style.display = '';
          el.removeAttribute('display');

          // If requested, push behind by placing as first child of the target member's parent
          if ((v as any).isBehindParent && targetMember) {
            const parentLive = (targetMember.parentNode as (Node & { insertBefore: Function; firstChild: ChildNode | null }) | null) ?? null;
            if (parentLive) {
              parentLive.insertBefore(el, parentLive.firstChild);
            }
          }
        } else {
          el.style.display = 'none';
        }

        // Ensure parent containers are visible if they carried display="none"
        let parent = el.parentElement as unknown as SVGElement | null;
        while (parent && parent !== puppetRoot) {
          if (parent.hasAttribute('display')) {
            parent.removeAttribute('display');
            (parent as SVGElement).style.display = '';
          }
          parent = parent.parentElement as unknown as SVGElement | null;
        }
      });
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
        if (typeof numericValue === 'number' && !isNaN(numericValue)) {
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
              memberEl.style.transform = `rotate(${transforms.rotation}deg)`;
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
            let x = parseFloat(el.getAttribute('x') || '0');
            let y = parseFloat(el.getAttribute('y') || '0');
            const w = parseFloat(el.getAttribute('width') || '0');
            const h = parseFloat(el.getAttribute('height') || '0');

            // Update position with animated values if present
            if (transforms.x !== undefined) x = transforms.x;
            if (transforms.y !== undefined) y = transforms.y;

            el.setAttribute('x', String(x));
            el.setAttribute('y', String(y));

            // Get current transform values
            const transformAttr = el.getAttribute('transform') || '';
            const rotMatch = transformAttr.match(/rotate\(([-\d.]+)/);
            const scaleMatch = transformAttr.match(/scale\(([-\d.]+)(?:[,\s]+([-\d.]+))?\)/);

            let rotation = rotMatch ? parseFloat(rotMatch[1] || '0') : 0;
            let scaleX = scaleMatch ? parseFloat(scaleMatch[1] || '1') : 1;
            let scaleY = scaleMatch && scaleMatch[2] ? parseFloat(scaleMatch[2]) : scaleX;

            // Update with animated values if present
            if (transforms.rotation !== undefined) rotation = transforms.rotation;
            if (transforms.scaleX !== undefined) scaleX = transforms.scaleX;
            if (transforms.scaleY !== undefined) scaleY = transforms.scaleY;

            const cx = x + w / 2;
            const cy = y + h / 2;

            el.setAttribute('transform', `rotate(${rotation} ${cx} ${cy}) scale(${scaleX} ${scaleY})`);
          }
        }
      });
    });
  }, [currentFrame, tracks, sceneItems, getValueAtFrame, refreshTrigger]);
};
