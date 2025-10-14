import { useRef, useCallback } from "react";
import type { WheelEvent, RefObject } from "react";

interface PanZoomHookArgs {
  svgRef: RefObject<SVGSVGElement | null>;
  viewportRef: RefObject<SVGGElement | null>;
  viewSizeRef: RefObject<{ w: number; h: number } | null>;
}

/**
 * A hook to manage pan, zoom, and coordinate conversion for the SVG scene.
 * @returns `onWheel` handler, `doFitInView` function, and `toSceneCoords` function.
 */
export const useScenePanZoom = ({
  svgRef,
  viewportRef,
  viewSizeRef,
}: PanZoomHookArgs) => {
  const viewStateRef = useRef({ scale: 1, tx: 0, ty: 0 });

  const toSceneCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const { w, h } = viewSizeRef.current ?? { w: rect.width, h: rect.height };
      const scale = Math.min(rect.width / w, rect.height / h);
      const offsetX = (rect.width - w * scale) / 2;
      const offsetY = (rect.height - h * scale) / 2;
      let x = (clientX - rect.left - offsetX) / scale;
      let y = (clientY - rect.top - offsetY) / scale;
      const vs = viewStateRef.current;
      x = (x - vs.tx) / vs.scale;
      y = (y - vs.ty) / vs.scale;
      return { x, y };
    },
    [svgRef, viewSizeRef],
  );

  const applyViewTransform = useCallback(() => {
    if (!viewportRef.current) return;
    const { scale, tx, ty } = viewStateRef.current;
    viewportRef.current.setAttribute(
      "transform",
      `translate(${Math.round(tx)} ${Math.round(ty)}) scale(${scale})`,
    );
  }, [viewportRef]);

  const doFitInView = useCallback(() => {
    viewStateRef.current = { scale: 1, tx: 0, ty: 0 };
    applyViewTransform();
  }, [applyViewTransform]);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (!viewSizeRef.current) return;
      const { x, y } = toSceneCoords(e.clientX, e.clientY);
      const vs = viewStateRef.current;

      if (e.ctrlKey) {
        // zoom
        const delta = -e.deltaY;
        const k = Math.exp(delta * 0.0015);
        const newScale = Math.min(5, Math.max(0.2, vs.scale * k));
        // zoom around mouse: adjust translation to keep (x,y) stable
        const sx = x * (1 - newScale / vs.scale);
        const sy = y * (1 - newScale / vs.scale);
        vs.tx += sx;
        vs.ty += sy;
        vs.scale = newScale;
        applyViewTransform();
        return;
      }
      // pan
      vs.tx -= e.deltaX;
      vs.ty -= e.deltaY;
      applyViewTransform();
    },
    [toSceneCoords, viewSizeRef, applyViewTransform],
  );

  return { onWheel, doFitInView, toSceneCoords };
};
