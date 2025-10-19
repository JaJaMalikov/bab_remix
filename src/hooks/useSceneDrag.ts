import React, { useRef, useEffect, useCallback } from "react";
import {
  readGraphicTransform,
  setImageTransform,
  parseTransformAttribute,
} from "../utils/svgTransform";
import { parseNumber } from "../utils/numbers";

// The state of a drag operation
type DraggingRef =
  | null
  | {
      type: "puppet";
      el: SVGGElement;
      startX: number;
      startY: number;
      tx0: number;
      ty0: number;
      itemId: string | null;
    }
  | {
      type: "graphic";
      el: SVGGraphicsElement;
      startX: number;
      startY: number;
      x0: number;
      y0: number;
      itemId: string | null;
    };

interface Coords { x: number; y: number }

export type SceneDragStartInfo =
  | {
      type: "puppet";
      itemId: string | null;
      element: SVGGElement;
      event: MouseEvent;
    }
  | {
      type: "image";
      itemId: string | null;
      element: SVGGraphicsElement;
      event: MouseEvent;
    };

interface DragOptions {
  onDragStart?: (info: SceneDragStartInfo) => void;
}

/**
 * A hook to manage dragging puppets and images within the SVG scene.
 * @param svgRef Ref to the main SVG element.
 * @param toSceneCoords Function to convert client coordinates to SVG scene coordinates.
 * @returns A ref indicating if a drag operation moved, to differentiate from a click.
 */
export const useSceneDrag = (
  svgRef: React.RefObject<SVGSVGElement | null>,
  toSceneCoords: (clientX: number, clientY: number) => Coords,
  options?: DragOptions,
) => {
  const draggingRef = useRef<DraggingRef>(null);
  const dragMovedRef = useRef(false);
  const onDragStart = options?.onDragStart;

  const getTranslate = useCallback((el: SVGGElement) => {
    try {
      const c = el.transform.baseVal.consolidate();
      if (c) {
        const m = c.matrix;
        return { tx: m.e || 0, ty: m.f || 0 };
      }
    } catch { /* empty */ }
    const parsed = parseTransformAttribute(el);
    return { tx: parsed.translate?.x ?? 0, ty: parsed.translate?.y ?? 0 };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // drag only with left click
      const path: EventTarget[] = (e.composedPath?.()) || [];
      let anchor: SVGGElement | null = null;
      let img: SVGGraphicsElement | null = null;
      for (const n of path) {
        if (n instanceof SVGGElement && n.hasAttribute("data-anchor")) {
          anchor = n;
          break;
        }
        if (
          n instanceof SVGGraphicsElement &&
          n.hasAttribute("data-draggable")
        ) {
          img = n;
          break;
        }
      }
      if (!anchor && !img) return;

      const pt = toSceneCoords(e.clientX, e.clientY);
      dragMovedRef.current = false;

      if (anchor) {
        const { tx, ty } = getTranslate(anchor);
        draggingRef.current = {
          type: "puppet",
          el: anchor,
          startX: pt.x,
          startY: pt.y,
          tx0: tx,
          ty0: ty,
          itemId: anchor.getAttribute("data-id"),
        };
        onDragStart?.({
          type: "puppet",
          itemId: draggingRef.current.itemId,
          element: anchor,
          event: e,
        });
        e.preventDefault();
      } else if (img) {
        const x0 = parseNumber(img.getAttribute("x"), 0);
        const y0 = parseNumber(img.getAttribute("y"), 0);
        draggingRef.current = {
          type: "graphic",
          el: img,
          startX: pt.x,
          startY: pt.y,
          x0,
          y0,
          itemId: img.getAttribute("data-id"),
        };
        onDragStart?.({
          type: "image",
          itemId: draggingRef.current.itemId,
          element: img,
          event: e,
        });
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

      if (drag.type === "puppet") {
        const tx = Math.round(drag.tx0 + dx);
        const ty = Math.round(drag.ty0 + dy);
        drag.el.setAttribute("transform", `translate(${tx}, ${ty})`);
        window.dispatchEvent(
          new CustomEvent("attachment:update", { detail: { anchor: drag.el } }),
        );
      } else if (drag.type === "graphic") {
        const x = Math.round(drag.x0 + dx);
        const y = Math.round(drag.y0 + dy);
        drag.el.setAttribute("x", String(x));
        drag.el.setAttribute("y", String(y));

        const transformAttr = drag.el.getAttribute("transform") ?? "";
        if (
          /\brotate\(/.test(transformAttr) ||
          /\bscale\(/.test(transformAttr)
        ) {
          const { rotation, scaleX, scaleY } = readGraphicTransform(drag.el);
          setImageTransform(drag.el, rotation, scaleX, scaleY);
        }
      }

      // Notify Inspector of transform change
      window.dispatchEvent(
        new CustomEvent("item:transformed", {
          detail: { id: drag.itemId, final: false },
        }),
      );
    };

    const onMouseUp = () => {
      if (draggingRef.current) {
        const drag = draggingRef.current;
        // Final notification when drag completes
        window.dispatchEvent(
          new CustomEvent("item:transformed", {
            detail: { id: drag.itemId, final: true },
          }),
        );
        if (drag.type === "puppet") {
          window.dispatchEvent(
            new CustomEvent("attachment:update", {
              detail: { anchor: drag.el },
            }),
          );
        }
      }
      draggingRef.current = null;
    };

    svg.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      svg.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [svgRef, toSceneCoords, getTranslate, onDragStart]);

  return dragMovedRef;
};
