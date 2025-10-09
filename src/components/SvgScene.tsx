import { useEffect, useRef, useState, memo, RefObject, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  SvgPuppetInlineSimple,
  applyPuppetVariants,
  setPuppetVariantSelection,
} from "./SvgPuppet";
import type { PuppetMetadata, PuppetVariantSelections } from "./SvgPuppet";
import { Asset } from "./AssetItem";
import { useUi } from "../context/UiContext";
import { useSceneDrag } from "../hooks/useSceneDrag";
import { useScenePanZoom } from "../hooks/useScenePanZoom";

const toDomMatrix = (matrix: DOMMatrix | SVGMatrix | null): DOMMatrix | null => {
  if (!matrix) return null;
  if (typeof DOMMatrix !== "undefined" && matrix instanceof DOMMatrix) {
    return matrix;
  }
  return new DOMMatrix([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]);
};

const matrixToString = (matrix: DOMMatrix) =>
  `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`;

type PuppetInstance = {
  id: string;
  src: string;
  anchor: SVGGElement;
  dropX: number;
  dropY: number;
  root: SVGGElement | null;
  metadata: PuppetMetadata | null;
  variants: PuppetVariantSelections;
};

export const SvgScene = memo(() => {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<SVGGElement | null>(null);
  const bgRef = useRef<SVGImageElement | null>(null);
  const sceneRef = useRef<SVGGElement | null>(null);
  const viewSizeRef = useRef<{ w: number; h: number } | null>(null);
  const {
    selectedPuppet,
    selectedLimb,
    angle,
    setSelectedPuppet: setUiSelectedPuppet,
    setSelectedLimb: setUiSelectedLimb,
    setAngle: setUiAngle,
    addSceneItem,
    setFitInView,
    setImportAsset,
    setSelectedPuppetMetadata,
    setSelectedVariantSelections,
    setVariantSetter,
    setAttachHandler,
    setDetachHandler,
  } = useUi();
  const [puppets, setPuppets] = useState<PuppetInstance[]>([]);
  const puppetsRef = useRef<PuppetInstance[]>([]);
  useEffect(() => {
    puppetsRef.current = puppets;
  }, [puppets]);

  // All pan, zoom, and coordinate logic is now in the hook
  const { onWheel, doFitInView, toSceneCoords } = useScenePanZoom({
    svgRef,
    viewportRef,
    viewSizeRef,
  });

  // Drag logic hook depends on coordinate conversion from the pan/zoom hook
  const dragMovedRef = useSceneDrag(svgRef as RefObject<SVGSVGElement>, toSceneCoords);

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
      anchor.setAttribute("transform", `translate(${Math.round(x)}, ${Math.round(y)})`);
      anchor.setAttribute("data-anchor", "puppet");
      anchor.style.cursor = "move";
      scene.appendChild(anchor);
      const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      setPuppets((prev) => [
        ...prev,
        {
          id,
          src: asset.path,
          anchor,
          dropX: x,
          dropY: y,
          root: null,
          metadata: null,
          variants: {},
        },
      ]);
      addSceneItem({ id, type: 'puppet', label: asset.name || asset.path.split('/').pop() || 'Puppet', el: anchor });
      return;
    }

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

  // Effect for drag/drop from library and click-to-select-limb
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

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return; // ignore right/middle click
      if (dragMovedRef.current) {
        dragMovedRef.current = false;
        return;
      }
      
      const limb = (e.target as Element)?.closest('[data-membre]') as SVGGElement | null;
      if (limb && limb.id) {
        const puppetAnchor = limb.closest('[data-anchor="puppet"]');
        const puppetRoot = puppetAnchor?.firstChild as SVGGElement | null;

        if (puppetRoot) {
          setUiSelectedPuppet(puppetRoot);
          setUiSelectedLimb(limb.id);
          const a = getLimbRotationFromDom(limb);
          setUiAngle(Math.round(a));
        }
      }
    };
    svg.addEventListener("dragover", onDragOver);
    svg.addEventListener("drop", onDrop);
    svg.addEventListener("click", onClick);
    return () => {
      svg.removeEventListener("dragover", onDragOver);
      svg.removeEventListener("drop", onDrop);
      svg.removeEventListener("click", onClick);
    };
  }, [toSceneCoords, setUiSelectedLimb, setUiAngle, dragMovedRef, setUiSelectedPuppet]);

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
    g.style.transform = `rotate(${deg}deg)`;
  };

  const getLimbRotationFromDom = (g: SVGGElement): number => {
    const t = g.style.transform || "";
    const rm = t.match(/rotate\(([-+\d.]+)deg\)/);
    if (!rm) return 0;
    const v = parseFloat(rm[1] || "0");
    return isFinite(v) ? v : 0;
  };

  const attachObjectToSelectedLimb = useCallback(
    (objectId: string) => {
      const svg = svgRef.current;
      const puppetRoot = selectedPuppet;
      if (!svg || !puppetRoot || !selectedLimb) return;
      const puppet = puppetsRef.current.find((inst) => inst.root === puppetRoot);
      if (!puppet || !puppet.root) return;
      const member = puppet.root.querySelector(`#${CSS.escape(selectedLimb)}`) as SVGGElement | null;
      if (!member) return;
      const element = svg.querySelector(
        `[data-id="${CSS.escape(objectId)}"]`,
      ) as SVGGraphicsElement | null;
      if (!element) return;
      const memberMatrix = toDomMatrix(member.getCTM());
      const elementMatrix = toDomMatrix(element.getCTM());
      if (!memberMatrix || !elementMatrix) return;
      let relative: DOMMatrix;
      try {
        relative = memberMatrix.inverse().multiply(elementMatrix);
      } catch {
        return;
      }
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      if (element instanceof SVGImageElement) {
        element.setAttribute('x', '0');
        element.setAttribute('y', '0');
      }
      element.removeAttribute('data-draggable');
      element.setAttribute('transform', matrixToString(relative));
      element.setAttribute('data-attached-to', member.id || selectedLimb);
      element.setAttribute('data-attached-puppet', puppet.id);
      member.appendChild(element);
    },
    [selectedPuppet, selectedLimb],
  );

  const detachObjectFromSelectedLimb = useCallback(
    (objectId: string) => {
      const svg = svgRef.current;
      const scene = sceneRef.current;
      if (!svg || !scene) return;
      const element = svg.querySelector(
        `[data-id="${CSS.escape(objectId)}"]`,
      ) as SVGGraphicsElement | null;
      if (!element) return;
      const worldMatrix = toDomMatrix(element.getCTM());
      if (!worldMatrix) return;
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      element.removeAttribute('data-attached-to');
      element.removeAttribute('data-attached-puppet');
      element.setAttribute('data-draggable', 'true');
      if (element instanceof SVGImageElement) {
        element.removeAttribute('transform');
        element.setAttribute('x', String(Math.round(worldMatrix.e)));
        element.setAttribute('y', String(Math.round(worldMatrix.f)));
      } else {
        element.setAttribute('transform', matrixToString(worldMatrix));
      }
      scene.appendChild(element);
    },
    [],
  );

  // Apply rotation when angle or selected limb changes
  useEffect(() => {
    if (!selectedPuppet || !selectedLimb) return;
    setLimbRotationOnDom(selectedPuppet, selectedLimb, angle);
  }, [angle, selectedLimb, selectedPuppet]);

  useEffect(() => {
    setAttachHandler(attachObjectToSelectedLimb);
    setDetachHandler(detachObjectFromSelectedLimb);
    return () => {
      setAttachHandler((_id) => {});
      setDetachHandler((_id) => {});
    };
  }, [attachObjectToSelectedLimb, detachObjectFromSelectedLimb, setAttachHandler, setDetachHandler]);

  useEffect(() => {
    if (!selectedPuppet) {
      setSelectedPuppetMetadata(null);
      setSelectedVariantSelections({});
      setVariantSetter((_group, _variantId) => {});
      return;
    }
    const puppet = puppetsRef.current.find((inst) => inst.root === selectedPuppet);
    if (!puppet) {
      setSelectedPuppetMetadata(null);
      setSelectedVariantSelections({});
      setVariantSetter((_group, _variantId) => {});
      return;
    }
    setSelectedPuppetMetadata(puppet.metadata);
    setSelectedVariantSelections({ ...puppet.variants });
    setVariantSetter((group, variantId) => {
      const current = puppetsRef.current.find((inst) => inst.root === selectedPuppet);
      if (!current || !current.root) return;
      const applied = setPuppetVariantSelection(current.root, current.metadata, group, variantId);
      const appliedId = applied ?? null;
      setPuppets((prev) =>
        prev.map((inst) =>
          inst.id === current.id
            ? { ...inst, variants: { ...inst.variants, [group]: appliedId } }
            : inst,
        ),
      );
      setSelectedVariantSelections((prev) => ({ ...prev, [group]: appliedId }));
    });
    return () => {
      setVariantSetter((_group, _variantId) => {});
    };
  }, [selectedPuppet, puppets, setSelectedPuppetMetadata, setSelectedVariantSelections, setVariantSetter]);

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
  }, [doFitInView, toSceneCoords]);

  return (
    <div className="scene-canvas" style={{ position: "relative" }}>
      <svg ref={svgRef} width="100%" height="100%" onWheel={onWheel} />
      {/* React portals of pantins injected into anchors */}
      {puppets.map((p) =>
        createPortal(
          <SvgPuppetInlineSimple
            as="g"
            src={p.src}
            onReady={(g, metadata, defaults) => {
              // center the puppet around the original drop point
              try {
                const bbox = g.getBBox();
                const tx = Math.round(p.dropX - (bbox.x + bbox.width / 2));
                const ty = Math.round(p.dropY - (bbox.y + bbox.height / 2));
                p.anchor.setAttribute("transform", `translate(${tx}, ${ty})`);
              } catch {}
              const variantState = metadata
                ? applyPuppetVariants(g, metadata, defaults)
                : { ...defaults };
              setPuppets((prev) =>
                prev.map((inst) =>
                  inst.id === p.id
                    ? {
                        ...inst,
                        root: g,
                        metadata: metadata ?? null,
                        variants: variantState,
                      }
                    : inst,
                ),
              );
              // DO NOT auto-select puppet on load, this was the source of the bug.
              // The user will select the puppet by clicking on it.
            }}
          />,
          p.anchor,
          p.id,
        ),
      )}
    </div>
  );
});
