import { useEffect, useRef, useState, memo } from "react";
import { createPortal } from "react-dom";
import { SvgPuppetInlineSimple } from "./SvgPuppet";
import { Asset } from "./AssetItem";
import { useUi } from "../context/UiContext";
import type { PuppetMetadata as UiPuppetMetadata } from "../context/UiContext";
import { useSceneDrag } from "../hooks/useSceneDrag";
import { useScenePanZoom } from "../hooks/useScenePanZoom";
import { useAnimationPlayback } from "../hooks/useAnimationPlayback";
import { setRotationWithOrigin, getRotationFromTransform } from "../utils/svgTransform";

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
      anchor.setAttribute("data-source", asset.path); // Store source for serialization
      anchor.style.cursor = "move";
      scene.appendChild(anchor);
      const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      // Metadata will be added in onReady callback
      setPuppets((prev) => [...prev, { id, src: asset.path, anchor, dropX: x, dropY: y }]);
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
      const img = (e.target as Element)?.closest('[data-draggable="true"]') as SVGImageElement | null;
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
          img.style.cursor = "move";

          const cx = itemData.transform.x + w / 2;
          const cy = itemData.transform.y + h / 2;
          const rotation = itemData.transform.rotation || 0;
          const scaleX = itemData.transform.scaleX || 1;
          const scaleY = itemData.transform.scaleY || 1;

          img.setAttribute("transform", `rotate(${rotation} ${cx} ${cy}) scale(${scaleX} ${scaleY})`);

          scene.appendChild(img);
          addSceneItem({ id: itemData.id, type: "image", label: itemData.label, el: img });
        }
      }

      // Note: Animation tracks will be loaded separately by AnimationContext listener
    };

    window.addEventListener("project:load", handleProjectLoad);
    return () => window.removeEventListener("project:load", handleProjectLoad);
  }, [sceneItems, addSceneItem]);

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
                  // Find the target member containing the variants
                  const targetMemberId = group.variants[0]?.targetMemberId;
                  if (!targetMemberId) return;

                  const targetMember = g.querySelector(`#${CSS.escape(targetMemberId)}`) as SVGGElement | null;
                  if (!targetMember) return;

                  // Find the parent member of targetMember
                  const targetMemberParentId = targetMember.getAttribute('data-parent');
                  const targetMemberParent = targetMemberParentId
                    ? g.querySelector(`#${CSS.escape(targetMemberParentId)}`) as SVGGElement | null
                    : null;

                  // Find the default variant name
                  const defaultVariant = group.variants.find(v => v.isDefault);
                  const defaultVariantName = defaultVariant?.name;

                  // Show only the default variant, hide all others
                  // Search in entire puppet root because variants with isBehindParent may have been moved
                  group.variants.forEach(variant => {
                    if (!variant.name) return;

                    const el = g.querySelector(`[data-variant-groupe="${group.group}"][data-variant-name="${variant.name}"]`) as SVGElement | null;

                    if (el) {
                      if (variant.name === defaultVariantName) {
                        el.style.display = '';
                        el.removeAttribute('display');

                        // If isBehindParent: move the TARGET MEMBER before its parent
                        if (variant.isBehindParent && targetMember && targetMemberParent && targetMemberParent.parentNode) {
                          if (targetMember.nextSibling !== targetMemberParent) {
                            targetMemberParent.parentNode.insertBefore(targetMember, targetMemberParent);
                          }
                        } else if (!variant.isBehindParent && targetMember && targetMemberParent) {
                          // Restore member to its normal position as child of its parent
                          if (targetMember.parentNode !== targetMemberParent) {
                            targetMemberParent.appendChild(targetMember);
                          }
                        }
                      } else {
                        el.style.display = 'none';
                      }
                    }
                  });
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
