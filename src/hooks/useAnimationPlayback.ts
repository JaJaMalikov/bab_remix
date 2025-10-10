import { useEffect } from 'react';
import { useAnimation } from '../context/AnimationContext';
import { useUi } from '../context/UiContext';

/**
 * Hook that applies animation values to scene elements during playback
 */
export const useAnimationPlayback = () => {
  const { currentFrame, getValueAtFrame, tracks } = useAnimation();
  const { sceneItems } = useUi();

  useEffect(() => {
    // Apply all animated values for current frame
    tracks.forEach((track) => {
      const item = sceneItems.find((i) => i.id === track.targetId);
      if (!item) return;

      const value = getValueAtFrame(track.targetId, track.targetMemberId, track.property, currentFrame);
      if (value === null) return;

      const el = item.el;

      // Apply to puppet member
      if (track.targetMemberId && item.type === 'puppet') {
        const anchor = el;
        const puppetRoot = anchor.firstChild as SVGGElement | null;
        if (puppetRoot) {
          const memberEl = puppetRoot.querySelector(`#${CSS.escape(track.targetMemberId)}`) as SVGGElement | null;
          if (memberEl) {
            if (track.property === 'rotation') {
              memberEl.style.transform = `rotate(${value}deg)`;
            }
          }
        }
      }
      // Apply to whole item (puppet position or image transform)
      else if (!track.targetMemberId) {
        if (item.type === 'puppet') {
          // Puppet position
          if (track.property === 'x' || track.property === 'y') {
            const transformAttr = el.getAttribute('transform') || '';
            const match = transformAttr.match(/translate\(([-\d.]+)[,\s]+([-\d.]+)\)/);
            const currentX = match ? parseFloat(match[1] || '0') : 0;
            const currentY = match ? parseFloat(match[2] || '0') : 0;

            const newX = track.property === 'x' ? value : currentX;
            const newY = track.property === 'y' ? value : currentY;

            el.setAttribute('transform', `translate(${newX}, ${newY})`);
          }
        } else {
          // Image transform
          const x = parseFloat(el.getAttribute('x') || '0');
          const y = parseFloat(el.getAttribute('y') || '0');
          const w = parseFloat(el.getAttribute('width') || '0');
          const h = parseFloat(el.getAttribute('height') || '0');
          const cx = x + w / 2;
          const cy = y + h / 2;

          // Get current transform values
          const transformAttr = el.getAttribute('transform') || '';
          const rotMatch = transformAttr.match(/rotate\(([-\d.]+)/);
          const scaleMatch = transformAttr.match(/scale\(([-\d.]+)(?:[,\s]+([-\d.]+))?\)/);

          let rotation = rotMatch ? parseFloat(rotMatch[1] || '0') : 0;
          let scaleX = scaleMatch ? parseFloat(scaleMatch[1] || '1') : 1;
          let scaleY = scaleMatch && scaleMatch[2] ? parseFloat(scaleMatch[2]) : scaleX;

          // Update based on property
          if (track.property === 'x') {
            el.setAttribute('x', String(value));
          } else if (track.property === 'y') {
            el.setAttribute('y', String(value));
          } else if (track.property === 'rotation') {
            rotation = value;
          } else if (track.property === 'scaleX') {
            scaleX = value;
          } else if (track.property === 'scaleY') {
            scaleY = value;
          }

          el.setAttribute('transform', `rotate(${rotation} ${cx} ${cy}) scale(${scaleX} ${scaleY})`);
        }
      }
    });
  }, [currentFrame, tracks, sceneItems, getValueAtFrame]);
};
