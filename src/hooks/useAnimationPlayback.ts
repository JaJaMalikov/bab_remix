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
    // Group tracks by target to apply all transforms at once
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
      transforms[track.property] = value;
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
