import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SvgPuppetInlineSimple } from "./SvgPuppet";
import { Asset } from "./Library";
import { useUi } from "../context/UiContext";

export const SvgScene = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<SVGGElement | null>(null);
  const bgRef = useRef<SVGImageElement | null>(null);
  const sceneRef = useRef<SVGGElement | null>(null);
  const viewSizeRef = useRef<{ w: number; h: number } | null>(null);
  const activePuppetRef = useRef<SVGGElement | null>(null);
  const viewStateRef = useRef({ scale: 1, tx: 0, ty: 0 });
  const {
    selectedLimb,
    angle,
    setSelectedPuppet: setUiSelectedPuppet,
    setLimbIds: setUiLimbIds,
    setSelectedLimb: setUiSelectedLimb,
    setAngle: setUiAngle,
    addSceneItem,
    setFitInView,
    setImportAsset,
  } = useUi();
  const [puppets, setPuppets] = useState<
    { id: string; src: string; anchor: SVGGElement; dropX: number; dropY: number }[]
  >([]);
  const draggingRef = useRef<
    | null
    | {
        type: "puppet";
        el: SVGGElement;
        startX: number;
        startY: number;
        tx0: number;
        ty0: number;
      }
    | {
        type: "image";
        el: SVGImageElement;
        startX: number;
        startY: number;
        x0: number;
        y0: number;
      }
  >(null);
  const dragMovedRef = useRef(false);

  // Convert client coords to scene coords using viewBox + aspect fit
  const toSceneCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const { w, h } = viewSizeRef.current ?? { w: rect.width, h: rect.height };
    const scale = Math.min(rect.width / w, rect.height / h);
    const offsetX = (rect.width - w * scale) / 2;
    const offsetY = (rect.height - h * scale) / 2;
    // Base scene coords before internal pan/zoom
    let x = (clientX - rect.left - offsetX) / scale;
    let y = (clientY - rect.top - offsetY) / scale;
    // Apply inverse of internal viewport transform
    const vs = viewStateRef.current;
    x = (x - vs.tx) / vs.scale;
    y = (y - vs.ty) / vs.scale;
    return { x, y };
  };

  const ensureContainers = () => {
    const svg = svgRef.current!;
    if (!viewportRef.current) {
      const v = document.createElementNS("http://www.w3.org/2000/svg", "g");
      v.setAttribute("data-viewport", "true");
      svg.appendChild(v);
      viewportRef.current = v;
    }
    if (!sceneRef.current) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("data-scene", "true");
      viewportRef.current!.appendChild(g);
      sceneRef.current = g;
    }
    return { viewport: viewportRef.current!, scene: sceneRef.current! };
  };

  const setDecor = async (href: string) => {
    const img = new Image();
    img.decoding = "async";
    const p = new Promise<{ w: number; h: number }>((resolve, reject) => {
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
    });
    img.src = href;
    const { w, h } = await p;

    const svg = svgRef.current!;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    viewSizeRef.current = { w, h };

    const { viewport } = ensureContainers();
    if (!bgRef.current) {
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "image");
      bg.setAttribute("x", "0");
      bg.setAttribute("y", "0");
      bg.setAttribute("width", String(w));
      bg.setAttribute("height", String(h));
      bg.setAttribute("href", href);
      viewport.insertBefore(bg, viewport.firstChild);
      bgRef.current = bg as SVGImageElement;
    } else {
      bgRef.current.setAttribute("width", String(w));
      bgRef.current.setAttribute("height", String(h));
      bgRef.current.setAttribute("href", href);
    }
  };

  const dropAsset = async (asset: Asset, x: number, y: number) => {
    const { scene } = ensureContainers();
    if (asset.type === "decor") {
      await setDecor(asset.path);
      return;
    }

    if (asset.type === "pantin") {
      const anchor = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      // initial placement at drop point; we'll re-center on load
      anchor.setAttribute("transform", `translate(${Math.round(x)}, ${Math.round(y)})`);
      anchor.setAttribute("data-anchor", "puppet");
      anchor.style.cursor = "move";
      scene.appendChild(anchor);
      const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      setPuppets((prev) => [...prev, { id, src: asset.path, anchor, dropX: x, dropY: y }]);
      addSceneItem({ id, type: 'puppet', label: asset.name || asset.path.split('/').pop() || 'Puppet', el: anchor });
      return;
    }

    // Simple image sprite (objet) avec taille réelle
    const preload = new Image();
    const dim = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      preload.onload = () => resolve({ w: preload.naturalWidth, h: preload.naturalHeight });
      preload.onerror = reject;
      preload.src = asset.path;
    });
    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttribute("href", asset.path);
    img.setAttribute("width", String(dim.w));
    img.setAttribute("height", String(dim.h));
    img.setAttribute("x", String(Math.round(x - dim.w / 2)));
    img.setAttribute("y", String(Math.round(y - dim.h / 2)));
    img.setAttribute("preserveAspectRatio", "xMidYMid meet");
    img.setAttribute("data-draggable", "true");
    img.style.cursor = "move";
    scene.appendChild(img);
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    img.setAttribute('data-id', id);
    addSceneItem({ id, type: 'image', label: asset.name || asset.path.split('/').pop() || 'Image', el: img });
  };

  useEffect(() => {
    const svg = svgRef.current!;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = "copy";
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer?.getData("application/json");
      if (!data) return;
      const asset: Asset = JSON.parse(data);
      const pt = toSceneCoords(e.clientX, e.clientY);
      await dropAsset(asset, pt.x, pt.y);
    };

    const getTranslate = (el: SVGGElement) => {
      try {
        const c = el.transform.baseVal.consolidate();
        if (c) {
          const m = c.matrix;
          return { tx: m.e || 0, ty: m.f || 0 };
        }
      } catch {}
      const t = el.getAttribute("transform") || "";
      const mm = t.match(/translate\(([^,\s)]+)[ ,]([^\s)]+)\)/);
      const tx = mm ? parseFloat(mm[1]) : 0;
      const ty = mm ? parseFloat(mm[2]) : 0;
      return { tx: isFinite(tx) ? tx : 0, ty: isFinite(ty) ? ty : 0 };
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // drag uniquement au clic gauche
      const path: EventTarget[] = (e.composedPath && e.composedPath()) || [];
      let anchor: SVGGElement | null = null;
      let img: SVGImageElement | null = null;
      for (const n of path) {
        if (n instanceof SVGGElement && (n as SVGGElement).hasAttribute("data-anchor")) {
          anchor = n as SVGGElement;
          break;
        }
        if (n instanceof SVGImageElement && (n as Element).hasAttribute("data-draggable")) {
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
          type: "puppet",
          el: anchor,
          startX: pt.x,
          startY: pt.y,
          tx0: tx,
          ty0: ty,
        };
        e.preventDefault();
        return;
      } else if (img) {
        const x0 = parseFloat(img.getAttribute("x") || "0");
        const y0 = parseFloat(img.getAttribute("y") || "0");
        draggingRef.current = {
          type: "image",
          el: img,
          startX: pt.x,
          startY: pt.y,
          x0: isFinite(x0) ? x0 : 0,
          y0: isFinite(y0) ? y0 : 0,
        };
        e.preventDefault();
        return;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;
      const pt = toSceneCoords(e.clientX, e.clientY);
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      dragMovedRef.current = true;
      if (drag.type === "puppet") {
        const tx = Math.round(drag.tx0 + dx);
        const ty = Math.round(drag.ty0 + dy);
        drag.el.setAttribute("transform", `translate(${tx}, ${ty})`);
      } else if (drag.type === "image") {
        const x = Math.round(drag.x0 + dx);
        const y = Math.round(drag.y0 + dy);
        drag.el.setAttribute("x", String(x));
        drag.el.setAttribute("y", String(y));
      }
      e.preventDefault();
    };

    const onMouseUp = () => {
      draggingRef.current = null;
    };

    svg.addEventListener("dragover", onDragOver);
    svg.addEventListener("drop", onDrop);
    svg.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    const onClick = (e: MouseEvent) => {
      if ((e as MouseEvent).button !== 0) return; // ignore clic droit/milieu
      if (dragMovedRef.current) {
        dragMovedRef.current = false;
        return;
      }
      const path: EventTarget[] = (e.composedPath && e.composedPath()) || [];
      for (const n of path) {
        if (
          n instanceof SVGGElement &&
          n.hasAttribute &&
          n.hasAttribute("data-pivot") &&
          n.id
        ) {
          setUiSelectedLimb(n.id);
          // Sync angle from DOM
          const a = getLimbRotationFromDom(n);
          setUiAngle(Math.round(a));
          break;
        }
      }
    };
    svg.addEventListener("click", onClick);
    return () => {
      svg.removeEventListener("dragover", onDragOver);
      svg.removeEventListener("drop", onDrop);
      svg.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      svg.removeEventListener("click", onClick);
    };
  }, []);

  // --- Helpers to set/get rotation on a limb group ---
  const setLimbRotationOnDom = (
    scope: SVGGElement,
    limbId: string,
    deg: number,
  ) => {
    const g = scope.querySelector(
      `#${CSS.escape(limbId)}`,
    ) as SVGGElement | null;
    if (!g) return;
    // Version simple: applique la rotation uniquement via CSS
    g.style.transform = `rotate(${deg}deg)`;
  };

  const getLimbRotationFromDom = (g: SVGGElement): number => {
    const t = g.style.transform || "";
    const rm = t.match(/rotate\(([-+\d.]+)deg\)/);
    if (!rm) return 0;
    const v = parseFloat(rm[1] || "0");
    return isFinite(v) ? v : 0;
  };

  // Apply rotation when angle or selected limb changes
  useEffect(() => {
    if (!activePuppetRef.current || !selectedLimb) return;
    setLimbRotationOnDom(activePuppetRef.current, selectedLimb, angle);
  }, [angle, selectedLimb]);

  // Default decor at startup
  useEffect(() => {
    setDecor("/assets/decors/scene.png").catch(() => {});
    ensureContainers();
  }, []);

  // Expose helpers to UI context (fitInView, importAsset)
  useEffect(() => {
    setFitInView(() => doFitInView);
    setImportAsset(() => (asset: Asset) => {
      const svg = svgRef.current!;
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const pt = toSceneCoords(cx, cy);
      dropAsset(asset, pt.x, pt.y);
    });
    return () => {
      setFitInView(undefined);
      setImportAsset(undefined);
    };
  }, []);

  // Pan/Zoom state and handler
  const applyViewTransform = () => {
    if (!viewportRef.current) return;
    const { scale, tx, ty } = viewStateRef.current;
    viewportRef.current.setAttribute('transform', `translate(${Math.round(tx)} ${Math.round(ty)}) scale(${scale})`);
  };
  const doFitInView = () => {
    viewStateRef.current = { scale: 1, tx: 0, ty: 0 };
    applyViewTransform();
  };
  const onWheel = (e: React.WheelEvent) => {
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
  };


  return (
    <div className="scene-canvas" style={{ position: "relative" }}>
      <svg ref={svgRef} width="100%" height="100%" onWheel={onWheel} />
      {/* React portals of pantins injected into anchors */}
      {puppets.map((p) =>
        createPortal(
          <SvgPuppetInlineSimple
            as="g"
            src={p.src}
            onReady={(g) => {
              // center the puppet around the original drop point
              try {
                const bbox = g.getBBox();
                const tx = Math.round(p.dropX - (bbox.x + bbox.width / 2));
                const ty = Math.round(p.dropY - (bbox.y + bbox.height / 2));
                p.anchor.setAttribute("transform", `translate(${tx}, ${ty})`);
              } catch {}
              // mark as active and sync UI
              activePuppetRef.current = g;
              setUiSelectedPuppet(g);
              const ids = Array.from(g.querySelectorAll("g[data-pivot][id]"))
                .map((el) => el.getAttribute("id")!)
                .filter(Boolean);
              setUiLimbIds(ids);
              if (ids.length) {
                setUiSelectedLimb(ids[0]!);
                setUiAngle(0);
              }
            }}
          />,
          p.anchor,
          p.id,
        ),
      )}
    </div>
  );
};
