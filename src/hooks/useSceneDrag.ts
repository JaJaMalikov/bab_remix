import React, { useRef, useEffect, useCallback } from 'react';

// The state of a drag operation
type DraggingRef = 
  | null
  | {
      type: 'puppet';
      el: SVGGElement;
      startX: number;
      startY: number;
      tx0: number;
      ty0: number;
    }
  | {
      type: 'image';
      el: SVGImageElement;
      startX: number;
      startY: number;
      x0: number;
      y0: number;
    };

type Coords = { x: number; y: number };

/**
 * A hook to manage dragging puppets and images within the SVG scene.
 * @param svgRef Ref to the main SVG element.
 * @param toSceneCoords Function to convert client coordinates to SVG scene coordinates.
 * @returns A ref indicating if a drag operation moved, to differentiate from a click.
 */
export const useSceneDrag = (
  svgRef: React.RefObject<SVGSVGElement | null>,
  toSceneCoords: (clientX: number, clientY: number) => Coords
) => {
  const draggingRef = useRef<DraggingRef>(null);
  const dragMovedRef = useRef(false);

  const getTranslate = useCallback((el: SVGGElement) => {
    try {
      const c = el.transform.baseVal.consolidate();
      if (c) {
        const m = c.matrix;
        return { tx: m.e || 0, ty: m.f || 0 };
      }
    } catch {}
    const t = el.getAttribute('transform') || '';
    const mm = t.match(/translate\(([^,\s)]+)[ ,]([^\s)]+)\)/);
    const tx = mm ? parseFloat(mm[1]) : 0;
    const ty = mm ? parseFloat(mm[2]) : 0;
    return { tx: isFinite(tx) ? tx : 0, ty: isFinite(ty) ? ty : 0 };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // drag only with left click
      const path: EventTarget[] = (e.composedPath && e.composedPath()) || [];
      let anchor: SVGGElement | null = null;
      let img: SVGImageElement | null = null;
      for (const n of path) {
        if (n instanceof SVGGElement && n.hasAttribute('data-anchor')) {
          anchor = n as SVGGElement;
          break;
        }
        if (n instanceof SVGImageElement && n.hasAttribute('data-draggable')) {
          img = n as SVGImageElement;
          break;
        }
      }
      if (!anchor && !img) return;

      const pt = toSceneCoords(e.clientX, e.clientY);
      dragMovedRef.current = false;

      if (anchor) {
        const { tx, ty } = getTranslate(anchor);
        draggingRef.current = {
          type: 'puppet',
          el: anchor,
          startX: pt.x,
          startY: pt.y,
          tx0: tx,
          ty0: ty,
        };
        e.preventDefault();
      } else if (img) {
        const x0 = parseFloat(img.getAttribute('x') || '0');
        const y0 = parseFloat(img.getAttribute('y') || '0');
        draggingRef.current = {
          type: 'image',
          el: img,
          startX: pt.x,
          startY: pt.y,
          x0: isFinite(x0) ? x0 : 0,
          y0: isFinite(y0) ? y0 : 0,
        };
        e.preventDefault();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;
      e.preventDefault();

      const pt = toSceneCoords(e.clientX, e.clientY);
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      dragMovedRef.current = true;

      if (drag.type === 'puppet') {
        const tx = Math.round(drag.tx0 + dx);
        const ty = Math.round(drag.ty0 + dy);
        drag.el.setAttribute('transform', `translate(${tx}, ${ty})`);
        window.dispatchEvent(new CustomEvent('attachment:update', { detail: { anchor: drag.el } }));
      } else if (drag.type === 'image') {
        const x = Math.round(drag.x0 + dx);
        const y = Math.round(drag.y0 + dy);
        drag.el.setAttribute('x', String(x));
        drag.el.setAttribute('y', String(y));
      }

      // Notify Inspector of transform change
      window.dispatchEvent(new CustomEvent('item:transformed'));
    };

    const onMouseUp = () => {
      if (draggingRef.current) {
        // Final notification when drag completes
        window.dispatchEvent(new CustomEvent('item:transformed'));
        if (draggingRef.current.type === 'puppet') {
          window.dispatchEvent(new CustomEvent('attachment:update', { detail: { anchor: draggingRef.current.el } }));
        }
      }
      draggingRef.current = null;
    };

    svg.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      svg.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [svgRef, toSceneCoords, getTranslate]);

  return dragMovedRef;
};
