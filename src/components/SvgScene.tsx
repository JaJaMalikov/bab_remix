import { useEffect, useRef, useState, memo, useCallback } from "react";
import { createPortal } from "react-dom";
import { SvgPuppetInlineSimple } from "./SvgPuppet";
import { Asset } from "./AssetItem";
import { useUi } from "../context/UiContext";
import type { PuppetMetadata as UiPuppetMetadata } from "../context/UiContext";
import { useSceneDrag } from "../hooks/useSceneDrag";
import { useScenePanZoom } from "../hooks/useScenePanZoom";
import { useAnimationPlayback } from "../hooks/useAnimationPlayback";
import { setRotationWithOrigin, getRotationFromTransform, setImageTransform } from "../utils/svgTransform";
import { applyVariantSelection } from "../utils/svgVariants";
import { useAnimation } from "../context/AnimationContext";

export const SvgScene = memo(() => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<SVGGElement | null>(null);
  const bgRef = useRef<SVGImageElement | null>(null);
  const sceneRef = useRef<SVGGElement | null>(null);
  const viewSizeRef = useRef<{ w: number; h: number } | null>(null);

  // Apply animation values during playback
  useAnimationPlayback();
  const {
    selectedPuppet,
    selectedLimb,
    angle,
    setSelectedPuppet: setUiSelectedPuppet,
    setSelectedLimb: setUiSelectedLimb,
    setAngle: setUiAngle,
    setSelectedItemId,
    sceneItems,
    addSceneItem,
    setFitInView,
    setImportAsset,
  } = useUi();
  const [puppets, setPuppets] = useState<
    { id: string; src: string; anchor: SVGGElement; dropX: number; dropY: number; metadata?: any }[]
  >([]);

  // All pan, zoom, and coordinate logic is now in the hook
  const { onWheel, doFitInView, toSceneCoords } = useScenePanZoom({
    svgRef,
    viewportRef,
    viewSizeRef,
  });

  // Drag logic hook depends on coordinate conversion from the pan/zoom hook
  const dragMovedRef = useSceneDrag(svgRef, toSceneCoords);
  const { currentFrame, addKeyframe, snapshotKeyframes } = useAnimation();
  const didInitialSnapshotRef = useRef(false);

  const ensureInitialSnapshot = useCallback(() => {
    if (currentFrame === 0 && !didInitialSnapshotRef.current) {
      snapshotKeyframes(sceneItems);
      didInitialSnapshotRef.current = true;
    }
  }, [currentFrame, sceneItems, snapshotKeyframes]);

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

  const setDecor = useCallback(async (href: string) => {
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
  }, []);

  const initializeVisibilityForItem = useCallback((itemId: string) => {
    const frame = currentFrame;
    addKeyframe(itemId, null, 'visible', frame, true);
    if (frame > 0) {
      addKeyframe(itemId, null, 'visible', frame - 1, false);
    }
  }, [addKeyframe, currentFrame]);

  // Helper: Generate unique item ID
  const generateItemId = () => `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

  // Helper: Parse SVG dimensions from attributes or viewBox
  const parseSvgDimensions = (svg: SVGSVGElement): { width: number; height: number } => {
    let width = parseFloat(svg.getAttribute("width") || "");
    let height = parseFloat(svg.getAttribute("height") || "");

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      const viewBox = svg.getAttribute("viewBox");
      if (viewBox) {
        const parts = viewBox.trim().split(/[\s,]+/).map((n) => parseFloat(n));
        if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
          width = parts[2];
          height = parts[3];
        }
      }
    }

    return {
      width: Number.isFinite(width) && width > 0 ? width : 100,
      height: Number.isFinite(height) && height > 0 ? height : 100,
    };
  };

  // Helper: Create SVG object element
  const createSvgObject = async (path: string, x: number, y: number) => {
    const response = await fetch(path);
    const svgText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const root = doc.documentElement;

    if (!(root instanceof SVGSVGElement)) {
      throw new Error("Asset root is not an SVG element");
    }

    const svg = root.cloneNode(true) as SVGSVGElement;
    const { width, height } = parseSvgDimensions(svg);

    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("x", String(Math.round(x - width / 2)));
    svg.setAttribute("y", String(Math.round(y - height / 2)));

    if (!svg.hasAttribute("viewBox")) {
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    svg.setAttribute("preserveAspectRatio", svg.getAttribute("preserveAspectRatio") || "xMidYMid meet");
    svg.setAttribute("data-draggable", "true");
    svg.setAttribute("data-source", path);
    svg.style.cursor = "move";

    const id = generateItemId();
    svg.setAttribute("data-id", id);

    return { svg, id };
  };

  // Helper: Create raster image element
  const createRasterImage = async (path: string, x: number, y: number) => {
    const preload = new Image();
    const dim = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      preload.onload = () => resolve({ w: preload.naturalWidth, h: preload.naturalHeight });
      preload.onerror = reject;
      preload.src = path;
    });

    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttribute("href", path);
    img.setAttribute("width", String(dim.w));
    img.setAttribute("height", String(dim.h));
    img.setAttribute("x", String(Math.round(x - dim.w / 2)));
    img.setAttribute("y", String(Math.round(y - dim.h / 2)));
    img.setAttribute("preserveAspectRatio", "xMidYMid meet");
    img.setAttribute("data-draggable", "true");
    img.setAttribute("data-source", path);
    img.style.cursor = "move";

    const id = generateItemId();
    img.setAttribute('data-id', id);

    return { img, id };
  };

  const dropAsset = useCallback(async (asset: Asset, x: number, y: number) => {
    const { scene } = ensureContainers();

    if (asset.type === "decor") {
      await setDecor(asset.path);
      return;
    }

    if (asset.type === "pantin") {
      const anchor = document.createElementNS("http://www.w3.org/2000/svg", "g");
      anchor.setAttribute("transform", `translate(${Math.round(x)}, ${Math.round(y)})`);
      anchor.setAttribute("data-anchor", "puppet");
      anchor.setAttribute("data-source", asset.path);
      anchor.style.cursor = "move";

      const id = generateItemId();
      anchor.setAttribute("data-id", id);

      scene.appendChild(anchor);
      setPuppets((prev) => [...prev, { id, src: asset.path, anchor, dropX: x, dropY: y }]);
      addSceneItem({ id, type: 'puppet', label: asset.name || asset.path.split('/').pop() || 'Puppet', el: anchor });
      initializeVisibilityForItem(id);
      return;
    }

    if (asset.type === "objet") {
      try {
        const { svg, id } = await createSvgObject(asset.path, x, y);
        scene.appendChild(svg);
        addSceneItem({ id, type: 'image', label: asset.name || asset.path.split('/').pop() || 'Objet', el: svg });
        initializeVisibilityForItem(id);
      } catch (error) {
        console.error("Failed to import SVG asset", error);
      }
      return;
    }

    // Default: raster image
    const { img, id } = await createRasterImage(asset.path, x, y);
    scene.appendChild(img);
    addSceneItem({ id, type: 'image', label: asset.name || asset.path.split('/').pop() || 'Image', el: img });
    initializeVisibilityForItem(id);
  }, [addSceneItem, initializeVisibilityForItem, setDecor, setPuppets]);

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

      // Check if clicked on a puppet (anchor or its content)
      const puppetAnchor = (e.target as Element)?.closest('[data-anchor="puppet"]') as SVGGElement | null;
      if (puppetAnchor) {
        const puppetItem = sceneItems.find(item => item.el === puppetAnchor);
        if (puppetItem) {
          setSelectedItemId(puppetItem.id);
        }

        // Only select a member if specifically clicking on one (not the background)
        const limb = (e.target as Element)?.closest('[data-membre]') as SVGGElement | null;
        if (limb && limb.id) {
          const puppetRoot = puppetAnchor.firstChild as SVGGElement | null;
          if (puppetRoot) {
            setUiSelectedPuppet(puppetRoot);
            setUiSelectedLimb(limb.id);
            const a = getLimbRotationFromDom(limb);
            setUiAngle(Math.round(a));
          }
        } else {
          // Clicked on puppet but not on a member - deselect member
          setUiSelectedLimb("");
        }
        return;
      }

      // Check if clicked on an image
      const img = (e.target as Element)?.closest('[data-draggable="true"]') as SVGGraphicsElement | null;
      if (img) {
        const imgId = img.getAttribute('data-id');
        if (imgId) {
          setSelectedItemId(imgId);
          setUiSelectedLimb("");
        }
        return;
      }

      // Clicked on empty space - deselect all
      setSelectedItemId(null);
      setUiSelectedLimb("");
    };
    svg.addEventListener("dragover", onDragOver);
    svg.addEventListener("drop", onDrop);
    svg.addEventListener("click", onClick);
    return () => {
      svg.removeEventListener("dragover", onDragOver);
      svg.removeEventListener("drop", onDrop);
      svg.removeEventListener("click", onClick);
    };
  }, [toSceneCoords, setUiSelectedLimb, setUiAngle, dragMovedRef, setUiSelectedPuppet, setSelectedItemId, sceneItems]);

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
    setRotationWithOrigin(g, deg);
  };

  const getLimbRotationFromDom = (g: SVGGElement): number => {
    return getRotationFromTransform(g);
  };

  // Apply rotation when angle or selected limb changes
  useEffect(() => {
    if (!selectedPuppet || !selectedLimb) return;
    setLimbRotationOnDom(selectedPuppet, selectedLimb, angle);
  }, [angle, selectedLimb, selectedPuppet]);

  // Default decor at startup
  useEffect(() => {
    setDecor("/assets/decors/scene.png").catch(() => {});
    ensureContainers();
  }, []);

  // Listen for project load events
  useEffect(() => {
    const handleProjectLoad = async (e: Event) => {
      const projectData = (e as CustomEvent).detail;

      // Clear current scene
      sceneItems.forEach((item) => {
        if (item.el.parentNode) {
          item.el.parentNode.removeChild(item.el);
        }
      });
      setPuppets([]);

      // Load background
      if (projectData.scene.background) {
        await setDecor(projectData.scene.background);
      }

      const { scene } = ensureContainers();

      // Recreate items
      for (const itemData of projectData.scene.items) {
        if (itemData.type === "puppet") {
          // Create puppet anchor
          const anchor = document.createElementNS("http://www.w3.org/2000/svg", "g");
          anchor.setAttribute("transform", `translate(${itemData.transform.x}, ${itemData.transform.y})`);
          anchor.setAttribute("data-anchor", "puppet");
          anchor.setAttribute("data-source", itemData.source);
          anchor.setAttribute("data-id", itemData.id);
          anchor.style.cursor = "move";
          scene.appendChild(anchor);

          // Add to puppets state to trigger React portal
          setPuppets((prev) => [
            ...prev,
            { id: itemData.id, src: itemData.source, anchor, dropX: itemData.transform.x, dropY: itemData.transform.y },
          ]);

          // Add to scene items
          addSceneItem({ id: itemData.id, type: "puppet", label: itemData.label, el: anchor });

          // Wait for puppet to load, then apply member transforms
          setTimeout(() => {
            if (itemData.memberTransforms) {
              const puppetRoot = anchor.firstChild as SVGGElement | null;
              if (puppetRoot) {
                Object.entries(itemData.memberTransforms).forEach(([memberId, transform]) => {
                  const memberEl = puppetRoot.querySelector(`#${CSS.escape(memberId)}`) as SVGGElement | null;
                  if (memberEl && transform && typeof transform === 'object' && 'rotation' in transform) {
                    const rotation = typeof transform.rotation === 'number' ? transform.rotation : 0;
                    setRotationWithOrigin(memberEl, rotation);
                  }
                });
              }
            }

            // Force position update by triggering animation playback
            window.dispatchEvent(new CustomEvent("animation:refresh"));
          }, 150);
        } else {
          const isSvgAsset = itemData.source.toLowerCase().endsWith(".svg");
          if (isSvgAsset) {
            try {
              const response = await fetch(itemData.source);
              const svgText = await response.text();
              const parser = new DOMParser();
              const doc = parser.parseFromString(svgText, "image/svg+xml");
              const root = doc.documentElement;
              if (!(root instanceof SVGSVGElement)) {
                throw new Error("Asset root is not an SVG element");
              }
              const svg = root.cloneNode(true) as SVGSVGElement;
              const { width, height } = parseSvgDimensions(svg);

              svg.setAttribute("width", String(width));
              svg.setAttribute("height", String(height));
              svg.setAttribute("x", String(itemData.transform.x));
              svg.setAttribute("y", String(itemData.transform.y));
              if (!svg.hasAttribute("viewBox")) {
                svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
              }
              svg.setAttribute("preserveAspectRatio", svg.getAttribute("preserveAspectRatio") || "xMidYMid meet");
              svg.setAttribute("data-draggable", "true");
              svg.setAttribute("data-id", itemData.id);
              svg.setAttribute("data-source", itemData.source);
              svg.style.cursor = "move";

              const rotation = itemData.transform.rotation || 0;
              const scaleX = itemData.transform.scaleX || 1;
              const scaleY = itemData.transform.scaleY || 1;
              setImageTransform(svg, rotation, scaleX, scaleY);

              scene.appendChild(svg);
              addSceneItem({ id: itemData.id, type: "image", label: itemData.label, el: svg });
            } catch (error) {
              console.error("Failed to load SVG object", error);
            }
          } else {
            // Create image
            const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
            img.setAttribute("href", itemData.source);

            // Load image to get dimensions
            const preload = new Image();
            await new Promise((resolve) => {
              preload.onload = resolve;
              preload.onerror = resolve;
              preload.src = itemData.source;
            });

            const w = preload.naturalWidth || 100;
            const h = preload.naturalHeight || 100;

            img.setAttribute("width", String(w));
            img.setAttribute("height", String(h));
            img.setAttribute("x", String(itemData.transform.x));
            img.setAttribute("y", String(itemData.transform.y));
            img.setAttribute("preserveAspectRatio", "xMidYMid meet");
            img.setAttribute("data-draggable", "true");
            img.setAttribute("data-id", itemData.id);
            img.setAttribute("data-source", itemData.source);
            img.style.cursor = "move";

            const rotation = itemData.transform.rotation || 0;
            const scaleX = itemData.transform.scaleX || 1;
            const scaleY = itemData.transform.scaleY || 1;

            setImageTransform(img, rotation, scaleX, scaleY);

            scene.appendChild(img);
            addSceneItem({ id: itemData.id, type: "image", label: itemData.label, el: img });
          }
        }
      }

      // Note: Animation tracks will be loaded separately by AnimationContext listener
    };

    window.addEventListener("project:load", handleProjectLoad);
    return () => window.removeEventListener("project:load", handleProjectLoad);
  }, [sceneItems, addSceneItem]);

  // Expose helpers to UI context (fitInView, importAsset)
  useEffect(() => {
    setFitInView(doFitInView);
    setImportAsset((asset: Asset) => {
      const svg = svgRef.current;
      if (!svg) return;
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
  }, [doFitInView, dropAsset, toSceneCoords]);

  const rotationStateRef = useRef<{
    limb: SVGGElement;
    puppetAnchor: SVGGElement;
    sceneItemId: string | null;
    origin: { x: number; y: number };
    startAngleRad: number;
    baseRotationRad: number;
    lastRotationDeg: number;
    hasMoved: boolean;
  } | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const parseTransformOrigin = (limb: SVGGElement): { local: { x: number; y: number }; screen: { x: number; y: number } } | null => {
      try {
        const originStr = limb.style.transformOrigin || getComputedStyle(limb).transformOrigin || "";
        if (!originStr) return null;
        const parts = originStr.trim().split(/\s+/);
        if (parts.length < 2) return null;
        const [oxRaw, oyRaw] = parts;
        const bbox = limb.getBBox();
        const parseValue = (value: string, axis: "x" | "y") => {
          if (value.endsWith("%")) {
            const percent = parseFloat(value) / 100;
            const base = axis === "x" ? bbox.x : bbox.y;
            const size = axis === "x" ? bbox.width : bbox.height;
            return base + size * percent;
          }
          const match = value.match(/(-?\d*\.?\d+)/);
          if (match) {
            return parseFloat(match[1]);
          }
          return axis === "x" ? bbox.x + bbox.width / 2 : bbox.y + bbox.height / 2;
        };
        const localX = parseValue(oxRaw, "x");
        const localY = parseValue(oyRaw, "y");
        const ownerSvg = limb.ownerSVGElement;
        const screenMatrix = limb.getScreenCTM();
        if (!ownerSvg || !screenMatrix) return null;
        const point = ownerSvg.createSVGPoint();
        point.x = localX;
        point.y = localY;
        const screenPoint = point.matrixTransform(screenMatrix);
        return { local: { x: localX, y: localY }, screen: { x: screenPoint.x, y: screenPoint.y } };
      } catch {
        return null;
      }
    };

    const normalizeRadians = (value: number) => {
      const twoPi = Math.PI * 2;
      let result = value % twoPi;
      if (result > Math.PI) result -= twoPi;
      if (result < -Math.PI) result += twoPi;
      return result;
    };

    const sceneItemsByElement = new Map<Element, string>();
    sceneItems.forEach((item) => {
      sceneItemsByElement.set(item.el, item.id);
    });

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!e.ctrlKey && !e.metaKey) return;
      const target = (e.target as Element | null)?.closest('[data-membre]') as SVGGElement | null;
      if (!target) return;

      const anchor = target.closest('[data-anchor="puppet"]') as SVGGElement | null;
      if (!anchor) return;

      const puppetRoot = anchor.firstChild as SVGGElement | null;
      if (!puppetRoot) return;

      const originInfo = parseTransformOrigin(target);
      if (!originInfo) return;

      const pointer = { x: e.clientX, y: e.clientY };
      const startAngleRad = Math.atan2(pointer.y - originInfo.screen.y, pointer.x - originInfo.screen.x);
      if (!Number.isFinite(startAngleRad)) return;

      const baseRotationDeg = getRotationFromTransform(target);
      const baseRotationRad = (baseRotationDeg * Math.PI) / 180;

      const sceneItemId = sceneItemsByElement.get(anchor) ?? null;

      rotationStateRef.current = {
        limb: target,
        puppetAnchor: anchor,
        sceneItemId,
        origin: originInfo.screen,
        startAngleRad,
        baseRotationRad,
        lastRotationDeg: baseRotationDeg,
        hasMoved: false,
      };

      dragMovedRef.current = true;

      if (sceneItemId) {
        setSelectedItemId(sceneItemId);
      }
      setUiSelectedPuppet(puppetRoot);
      setUiSelectedLimb(target.id);
      setUiAngle(Math.round(baseRotationDeg));

      e.stopPropagation();
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      const state = rotationStateRef.current;
      if (!state) return;
      const pointer = { x: e.clientX, y: e.clientY };
      const currentAngleRad = Math.atan2(pointer.y - state.origin.y, pointer.x - state.origin.x);
      if (!Number.isFinite(currentAngleRad)) return;

      const delta = normalizeRadians(currentAngleRad - state.startAngleRad);
      const newRotationRad = state.baseRotationRad + delta;
      const newRotationDeg = (newRotationRad * 180) / Math.PI;

      setRotationWithOrigin(state.limb, newRotationDeg);
      setUiAngle(Math.round(newRotationDeg));
      state.lastRotationDeg = newRotationDeg;
      state.hasMoved = true;

      ensureInitialSnapshot();
      if (state.sceneItemId) {
        addKeyframe(state.sceneItemId, state.limb.id, 'rotation', currentFrame, newRotationDeg);
      }

      window.dispatchEvent(new CustomEvent('item:transformed', { detail: { id: state.sceneItemId, final: false } }));
    };

    const onMouseUp = () => {
      const state = rotationStateRef.current;
      if (!state) return;

      if (state.hasMoved) {
        ensureInitialSnapshot();
        if (state.sceneItemId) {
          addKeyframe(state.sceneItemId, state.limb.id, 'rotation', currentFrame, state.lastRotationDeg);
        }
        window.dispatchEvent(new CustomEvent('item:transformed', { detail: { id: state.sceneItemId, final: true } }));
      }
      rotationStateRef.current = null;
    };

    const captureOptions: AddEventListenerOptions = { capture: true };
    svg.addEventListener('mousedown', onMouseDown, captureOptions);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      svg.removeEventListener('mousedown', onMouseDown, captureOptions);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [
    addKeyframe,
    currentFrame,
    ensureInitialSnapshot,
    sceneItems,
    setSelectedItemId,
    setUiAngle,
    setUiSelectedLimb,
    setUiSelectedPuppet,
    dragMovedRef,
  ]);

  return (
    <div className="scene-canvas" style={{ position: "relative" }}>
      <svg ref={svgRef} width="100%" height="100%" onWheel={onWheel} data-scene="true" />
      {/* React portals of pantins injected into anchors */}
      {puppets.map((p) =>
        createPortal(
          <SvgPuppetInlineSimple
            as="g"
            src={p.src}
            onReady={(g, metadata) => {
              // Store sanitized metadata compatible with UiContext.PuppetMetadata
              if (metadata) {
                const safeMeta: UiPuppetMetadata = {
                  id: metadata.id,
                  source: metadata.source,
                  variantGroups: (metadata.variantGroups || []).map((group: any) => ({
                    group: group.group,
                    defaultVariantId: group.defaultVariantId ?? null,
                    variants: (group.variants || []).map((v: any) => ({
                      targetMemberId: v.targetMemberId ?? null,
                      name: v.name ?? null,
                      isDefault: !!v.isDefault,
                      isBehindParent: !!v.isBehindParent,
                    })),
                  })),
                };
                const item = sceneItems.find(item => item.el === p.anchor);
                if (item) {
                  item.metadata = safeMeta;
                }

                // Initialize variant visibility - hide non-default variants
                safeMeta.variantGroups.forEach((group) => {
                  const defaultVariant = group.variants.find(v => v.isDefault);
                  applyVariantSelection(g, group, defaultVariant?.name ?? null);
                });
              }
              // center the puppet around the original drop point
              try {
                const bbox = g.getBBox();
                const tx = Math.round(p.dropX - (bbox.x + bbox.width / 2));
                const ty = Math.round(p.dropY - (bbox.y + bbox.height / 2));
                p.anchor.setAttribute("transform", `translate(${tx}, ${ty})`);
              } catch {}
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
