import { useEffect, useRef, useState, memo, useCallback } from "react";
import { createPortal } from "react-dom";
import { SvgPuppetInlineSimple } from "./SvgPuppet";
import { Asset } from "./AssetItem";
import { useUi } from "../context/UiContext";
import type { PuppetMetadata as UiPuppetMetadata } from "../context/UiContext";
import { useSceneDrag } from "../hooks/useSceneDrag";
import { useScenePanZoom } from "../hooks/useScenePanZoom";
import { useAnimationPlayback } from "../hooks/useAnimationPlayback";
import { applyVariantSelection } from "../utils/svgVariants";
import { useAnimation } from "../context/AnimationContext";
import { useAssetDropHandler } from "../hooks/useAssetDropHandler";
import { useSceneClickHandler } from "../hooks/useSceneClickHandler";
import { useLimbRotator } from "../hooks/useLimbRotator";
import { useProjectLoader } from "../hooks/useProjectLoader";

export const SvgScene = memo(() => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<SVGGElement | null>(null);
  const bgRef = useRef<SVGImageElement | null>(null);
  const sceneRef = useRef<SVGGElement | null>(null);
  const viewSizeRef = useRef<{ w: number; h: number } | null>(null);

  // Apply animation values during playback
  useAnimationPlayback();
  const {
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
    {
      id: string;
      src: string;
      anchor: SVGGElement;
      dropX: number;
      dropY: number;
      metadata?: any;
    }[]
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

  const ensureContainers = useCallback(() => {
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
  }, []);

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
      const bg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "image",
      );
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
  }, [ensureContainers]);

  const initializeVisibilityForItem = useCallback(
    (itemId: string) => {
      const frame = currentFrame;
      addKeyframe(itemId, null, "visible", frame, true);
      if (frame > 0) {
        addKeyframe(itemId, null, "visible", frame - 1, false);
      }
    },
    [addKeyframe, currentFrame],
  );

  const { dropAsset } = useAssetDropHandler({
    addSceneItem,
    initializeVisibilityForItem,
    setPuppets,
    setDecor,
    ensureContainers,
  });

  const { onClick } = useSceneClickHandler({
    dragMovedRef,
    sceneItems,
    setSelectedItemId,
    setUiSelectedPuppet,
    setUiSelectedLimb,
    setUiAngle,
  });

  useLimbRotator({
    svgRef,
    dragMovedRef,
    sceneItems,
    setSelectedItemId,
    setUiSelectedPuppet,
    setUiSelectedLimb,
    setUiAngle,
    addKeyframe,
    currentFrame,
    ensureInitialSnapshot,
  });

  useProjectLoader({
    sceneItems,
    addSceneItem,
    setPuppets,
    setDecor,
    ensureContainers,
  });

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

    svg.addEventListener("dragover", onDragOver);
    svg.addEventListener("drop", onDrop);
    svg.addEventListener("click", onClick);
    return () => {
      svg.removeEventListener("dragover", onDragOver);
      svg.removeEventListener("drop", onDrop);
      svg.removeEventListener("click", onClick);
    };
  }, [toSceneCoords, dropAsset, onClick]);

  // Default decor at startup
  useEffect(() => {
    setDecor("/assets/decors/scene.png").catch(() => {});
    ensureContainers();
  }, [ensureContainers, setDecor]);

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

  return (
    <div
      className="scene-canvas"
      style={{ position: "relative" }}
      data-testid="scene-canvas"
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onWheel={onWheel}
        data-scene="true"
      />
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
                  variantGroups: (metadata.variantGroups || []).map(
                    (group: any) => ({
                      group: group.group,
                      defaultVariantId: group.defaultVariantId ?? null,
                      variants: (group.variants || []).map((v: any) => ({
                        targetMemberId: v.targetMemberId ?? null,
                        name: v.name ?? null,
                        isDefault: !!v.isDefault,
                        isBehindParent: !!v.isBehindParent,
                      })),
                    }),
                  ),
                };
                const item = sceneItems.find((item) => item.el === p.anchor);
                if (item) {
                  item.metadata = safeMeta;
                }

                // Initialize variant visibility - hide non-default variants
                safeMeta.variantGroups.forEach((group) => {
                  const defaultVariant = group.variants.find(
                    (v) => v.isDefault,
                  );
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
            }}
          />,
          p.anchor,
          p.id,
        ),
      )}
    </div>
  );
});
