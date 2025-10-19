import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import { useUi } from "../context/UiContext";
import { useAnimation, AnimationProperty } from "../context/AnimationContext";
import { SceneItemList } from "./inspector/SceneItemList";
import { ItemProperties } from "./inspector/ItemProperties";
import { TransformEditor } from "./inspector/TransformEditor";
import { AttachmentEditor } from "./inspector/AttachmentEditor";
import { VariantEditor } from "./inspector/VariantEditor";
import { MemberEditor } from "./inspector/MemberEditor";
import { MemberTransformEditor } from "./inspector/MemberTransformEditor";
import {
  setRotationWithOrigin,
  getRotationFromTransform,
  setImageTransform,
  readGraphicTransform,
  readItemTransform,
} from "../utils/svgTransform";
import {
  embedAttachmentIntoMember,
  releaseAttachmentFromMember,
} from "../utils/attachment";
import { useToast } from "../hooks/use-toast";
import {
  applyVariantSelection,
  findVisibleVariant,
} from "../utils/svgVariants";

function InspectorComponent() {
  const { toast } = useToast();
  const {
    sceneItems,
    selectedItemId,
    setSelectedItemId,
    selectedLimb,
    setSelectedLimb,
    angle,
    setAngle,
    removeSceneItem,
  } = useUi();

  const {
    currentFrame,
    addKeyframe,
    removeAllTracksForTarget,
    getValueAtFrame,
    snapshotKeyframes,
  } = useAnimation();

  const selectedItem = useMemo(
    () => sceneItems.find((item) => item.id === selectedItemId),
    [sceneItems, selectedItemId],
  );


  const didInitialSnapshotRef = React.useRef(false);

  const ensureInitialSnapshot = useCallback(() => {
    if (currentFrame === 0 && !didInitialSnapshotRef.current) {
      snapshotKeyframes(sceneItems);
      didInitialSnapshotRef.current = true;
    }
  }, [currentFrame, sceneItems, snapshotKeyframes]);

  // Live transform state
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  });
  const [transformRefresh, setTransformRefresh] = useState(0);
  const lastTransformsRef = useRef<Map<string, Record<string, number>>>(
    new Map(),
  );

  // Active variants per puppet (keyed by puppetId:groupName)
  const [activeVariants, setActiveVariants] = useState<Record<string, string>>(
    {},
  );

  // Listen for drag/transform updates
  useEffect(() => {
    const THRESHOLD = 0.01;
    const handleTransformUpdate = (event: Event) => {
      setTransformRefresh((prev) => prev + 1);

      const customEvent = event as CustomEvent<{
        id?: string;
        final?: boolean;
      }>;
      const detail = customEvent.detail || {};
      if (!detail.id) return;

      const item = sceneItems.find((i) => i.id === detail.id);
      if (!item) return;

      const snapshot = readItemTransform(item.el, item.type);
      const isFinal = Boolean(detail.final);

      if (isFinal) {
        const lastSnapshot = lastTransformsRef.current.get(item.id) ?? {};
        const changedProps: Array<{
          property: AnimationProperty;
          value: number;
        }> = [];

        const diff = (
          prop: keyof typeof snapshot,
          property: AnimationProperty,
        ) => {
          const next = snapshot[prop];
          const prev = lastSnapshot[prop];
          if (typeof next !== "number") return;

          if (typeof prev !== "number" || Math.abs(prev - next) > THRESHOLD) {
            changedProps.push({ property, value: next });
          }
        };

        if (item.type === "puppet") {
          diff("x", "x");
          diff("y", "y");
        } else if (item.type === "image") {
          const graphicEl = item.el as SVGGraphicsElement;
          const isEmbeddedAttachment =
            graphicEl.getAttribute("data-attached-mode") === "embedded";
          if (!isEmbeddedAttachment) {
            diff("x", "x");
            diff("y", "y");
          }
          diff("rotation", "rotation");
          diff("scaleX", "scaleX");
          diff("scaleY", "scaleY");
        }

        if (changedProps.length > 0) {
          ensureInitialSnapshot();
          changedProps.forEach(({ property, value }) => {
            addKeyframe(item.id, null, property, currentFrame, value);
          });
        }

        lastTransformsRef.current.set(item.id, snapshot);
      }
    };

    window.addEventListener("item:transformed", handleTransformUpdate);
    return () =>
      window.removeEventListener("item:transformed", handleTransformUpdate);
  }, [sceneItems, addKeyframe, currentFrame, ensureInitialSnapshot]);

  // Initialize default variants when selecting a puppet
  useEffect(() => {
    if (
      !selectedItem ||
      selectedItem.type !== "puppet" ||
      !selectedItem.metadata
    )
      return;

    const anchor = selectedItem.el;
    const puppetRoot = anchor.firstChild as SVGGElement | null;
    if (!puppetRoot) return;

    selectedItem.metadata.variantGroups.forEach((group) => {
      const key = `${selectedItem.id}:${group.group}`;

      if (!activeVariants[key]) {
        const defaultVariant =
          group.variants.find((v) => v.isDefault) || group.variants[0];
        const defaultName = defaultVariant?.name ?? null;

        if (defaultName) {
          setActiveVariants((prev) => ({ ...prev, [key]: defaultName }));
          applyVariantSelection(puppetRoot, group, defaultName);
        }
      }
    });
  }, [selectedItem, activeVariants]);

  // Read transform from DOM whenever selectedItem, currentFrame, or drag updates
  useEffect(() => {
    if (!selectedItem) return;
    setTransform(readItemTransform(selectedItem.el, selectedItem.type));
  }, [selectedItem, currentFrame, transformRefresh]);

  // Get limb list for selected puppet
  const limbList = useMemo(() => {
    if (!selectedItem || selectedItem.type !== "puppet") return [];
    const anchor = selectedItem.el;
    const puppetRoot = anchor.firstChild as SVGGElement | null;
    if (!puppetRoot) return [];

    const limbs = puppetRoot.querySelectorAll("[data-membre]");
    return Array.from(limbs).map((limb) => ({
      id: limb.id,
      name: limb.id, // In new format, id is the member name
    }));
  }, [selectedItem]);

  const handleSelectItem = useCallback(
    (id: string) => {
      setSelectedItemId(id);
      setSelectedLimb("");
    },
    [setSelectedItemId, setSelectedLimb],
  );

  const handleDeselectAll = useCallback(() => {
    setSelectedItemId(null);
    setSelectedLimb("");
  }, [setSelectedItemId, setSelectedLimb]);

  const handleDeleteItem = useCallback((id: string) => {
    const item = sceneItems.find((i) => i.id === id);
    if (item?.el.parentNode) {
      item.el.parentNode.removeChild(item.el);
    }
    removeSceneItem(id);
    removeAllTracksForTarget(id); // Remove animation tracks
    if (selectedItemId === id) {
      setSelectedItemId(null);
      setSelectedLimb("");
    }
  }, [
    selectedItemId,
    sceneItems,
    removeSceneItem,
    removeAllTracksForTarget,
    setSelectedItemId,
    setSelectedLimb,
  ]);



  const handleSelectLimb = useCallback(
    (limbId: string) => {
      setSelectedLimb(limbId);
      // Get current rotation from DOM
      if (selectedItem?.type === "puppet") {
        const anchor = selectedItem.el;
        const puppetRoot = anchor.firstChild as SVGGElement | null;
        if (puppetRoot) {
          const limbEl = puppetRoot.querySelector(
            `#${CSS.escape(limbId)}`,
          ) as SVGGElement | null;
          if (limbEl) {
            setAngle(getRotationFromTransform(limbEl));
          }
        }
      }
    },
    [setSelectedLimb, selectedItem, setAngle],
  );

  const handleAngleChange = useCallback(
    (newAngle: number) => {
      setAngle(newAngle);
      if (selectedLimb && selectedItem?.type === "puppet") {
        const anchor = selectedItem.el;
        const puppetRoot = anchor.firstChild as SVGGElement | null;
        if (puppetRoot) {
          const limbEl = puppetRoot.querySelector(
            `#${CSS.escape(selectedLimb)}`,
          ) as SVGGElement | null;
          if (limbEl) {
            setRotationWithOrigin(limbEl, newAngle);
            // Auto keyframe for limb rotation
            ensureInitialSnapshot();
            addKeyframe(
              selectedItem.id,
              selectedLimb,
              "rotation",
              currentFrame,
              newAngle,
            );
          }
        }
      }
    },
    [
      setAngle,
      selectedLimb,
      selectedItem,
      addKeyframe,
      currentFrame,
      ensureInitialSnapshot,
    ],
  );

  // Handle position change
  const handlePositionChange = useCallback(
    (axis: "x" | "y", value: number) => {
      if (!selectedItem) return;
      const newTransform = { ...transform, [axis]: value };
      setTransform(newTransform);

      const el = selectedItem.el;
      if (selectedItem.type === "puppet") {
        el.setAttribute(
          "transform",
          `translate(${newTransform.x}, ${newTransform.y})`,
        );
      } else {
        const graphicEl = el as SVGGraphicsElement;
        graphicEl.setAttribute(axis, String(value));
        const transformAttr = el.getAttribute("transform") || "";
        if (
          /\brotate\(/.test(transformAttr) ||
          /\bscale\(/.test(transformAttr)
        ) {
          const { rotation, scaleX, scaleY } = readGraphicTransform(graphicEl);
          setImageTransform(graphicEl, rotation, scaleX, scaleY);
        }
      }

      // Auto keyframe for position
      ensureInitialSnapshot();
      addKeyframe(selectedItem.id, null, axis, currentFrame, value);
    },
    [selectedItem, transform, addKeyframe, currentFrame, ensureInitialSnapshot],
  );

  // Handle rotation change for images
  const handleRotationChange = useCallback(
    (value: number) => {
      if (!selectedItem || selectedItem.type !== "image") return;
      const newTransform = { ...transform, rotation: value };
      setTransform(newTransform);

      const el = selectedItem.el as SVGGraphicsElement;
      setImageTransform(el, value, newTransform.scaleX, newTransform.scaleY);

      // Auto keyframe for image rotation
      ensureInitialSnapshot();
      addKeyframe(selectedItem.id, null, "rotation", currentFrame, value);
    },
    [selectedItem, transform, addKeyframe, currentFrame, ensureInitialSnapshot],
  );

  // Handle scale change for images
  const handleScaleChange = useCallback(
    (axis: "scaleX" | "scaleY", value: number) => {
      if (!selectedItem || selectedItem.type !== "image") return;
      const newTransform = { ...transform, [axis]: value };
      setTransform(newTransform);

      const el = selectedItem.el as SVGGraphicsElement;
      setImageTransform(
        el,
        newTransform.rotation,
        newTransform.scaleX,
        newTransform.scaleY,
      );

      // Auto keyframe for image scale
      ensureInitialSnapshot();
      addKeyframe(selectedItem.id, null, axis, currentFrame, value);
    },
    [selectedItem, transform, addKeyframe, currentFrame, ensureInitialSnapshot],
  );

  // Get current variant for a group
  const getCurrentVariant = useCallback(
    (groupName: string): string | null => {
      if (!selectedItem) return null;
      // Prefer value from animation at current frame
      const animated = getValueAtFrame(
        selectedItem.id,
        groupName,
        "activeVariant",
        currentFrame,
      );
      if (typeof animated === "string" && animated) return animated;
      // Fallback to locally stored active variants
      const key = `${selectedItem.id}:${groupName}`;
      return activeVariants[key] || null;
    },
    [selectedItem, activeVariants, getValueAtFrame, currentFrame],
  );

  // Handle variant change
  const handleVariantChange = useCallback(
    (groupName: string, variantName: string) => {
      if (
        !selectedItem ||
        selectedItem.type !== "puppet" ||
        !selectedItem.metadata
      )
        return;

      const group = selectedItem.metadata.variantGroups.find(
        (g) => g.group === groupName,
      );
      if (!group) return;

      // Store active variant
      const key = `${selectedItem.id}:${groupName}`;
      setActiveVariants((prev) => ({ ...prev, [key]: variantName }));

      const anchor = selectedItem.el;
      const puppetRoot = anchor.firstChild as SVGGElement | null;
      if (!puppetRoot) return;

      applyVariantSelection(puppetRoot, group, variantName);

      // Auto keyframe for active variant
      ensureInitialSnapshot();
      addKeyframe(
        selectedItem.id,
        groupName,
        "activeVariant",
        currentFrame,
        variantName,
      );
    },
    [selectedItem, addKeyframe, currentFrame, ensureInitialSnapshot],
  );

  // Helper to update attachment with automatic keyframing and error handling
  const updateAttachmentWithKeyframes = useCallback(
    (updateFn: () => Record<string, any> | null, errorMessage: string) => {
      if (!selectedItem || selectedItem.type !== "image") return;

      try {
        const result = updateFn();
        if (!result) throw new Error(errorMessage);

        ensureInitialSnapshot();

        // Add keyframes for all returned properties
        Object.entries(result).forEach(([prop, value]) => {
          if (value !== undefined) {
            addKeyframe(
              selectedItem.id,
              null,
              prop as AnimationProperty,
              currentFrame,
              value,
            );
          }
        });

        window.dispatchEvent(new Event("animation:refresh"));
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: errorMessage,
        });
        console.error(err);
      }
    },
    [selectedItem, ensureInitialSnapshot, addKeyframe, currentFrame],
  );

  // Handle detaching image from puppet member
  const handleDetachFromMember = useCallback(() => {
    if (!selectedItem || selectedItem.type !== "image") return;

    const imageEl = selectedItem.el as SVGGraphicsElement;
    if (!imageEl.hasAttribute("data-attached-to-puppet")) return;

    updateAttachmentWithKeyframes(() => {
      const releaseResult = releaseAttachmentFromMember(imageEl);
      if (!releaseResult) return null;

      imageEl.removeAttribute("data-attached-to-puppet");
      imageEl.removeAttribute("data-attached-to-member");
      imageEl.removeAttribute("data-attachment-offset-cx");
      imageEl.removeAttribute("data-attachment-offset-cy");

      return {
        attachment: "",
        x: releaseResult.sceneX,
        y: releaseResult.sceneY,
        rotation: releaseResult.rotation,
        scaleX: releaseResult.scaleX,
        scaleY: releaseResult.scaleY,
      };
    }, "Failed to detach image. Please try again.");
  }, [selectedItem, updateAttachmentWithKeyframes]);

  // Handle attaching image to puppet member
  const handleAttachToMember = useCallback(
    (targetValue: string) => {
      if (!selectedItem || selectedItem.type !== "image") return;

      const [puppetId, memberId] = targetValue.split(":");
      const puppet = sceneItems.find((item) => item.id === puppetId);
      if (!puppet || puppet.type !== "puppet") return;

      const puppetAnchor = puppet.el as SVGGElement;
      const puppetRoot = puppetAnchor.firstChild as SVGGElement | null;
      if (!puppetRoot) return;

      // Find the target member - could be a variant!
      let member = puppetRoot.querySelector(
        `#${CSS.escape(memberId)}`,
      ) as SVGGElement | null;
      if (!member) return;

      // If member has variants and is hidden, find the visible variant instead
      if (
        member.style.display === "none" ||
        member.getAttribute("display") === "none"
      ) {
        const visibleVariant = findVisibleVariant(puppetRoot, memberId);
        if (visibleVariant) {
          member = visibleVariant;
        }
      }

      const imageEl = selectedItem.el as SVGGraphicsElement;

      updateAttachmentWithKeyframes(() => {
        const attachmentResult = embedAttachmentIntoMember({
          element: imageEl,
          member,
          anchor: puppetAnchor,
          layer:
            (imageEl.getAttribute("data-attachment-layer") as
              | "front"
              | "behind") || "front",
        });
        if (!attachmentResult) return null;

        imageEl.setAttribute("data-attached-to-puppet", puppetId);
        imageEl.setAttribute("data-attached-to-member", memberId);
        imageEl.removeAttribute("data-attachment-offset-cx");
        imageEl.removeAttribute("data-attachment-offset-cy");

        return {
          attachment: `${puppetId}:${memberId}`,
          x: attachmentResult.localX,
          y: attachmentResult.localY,
        };
      }, "Failed to attach image. Please try again.");
    },
    [selectedItem, sceneItems, updateAttachmentWithKeyframes],
  );

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <SceneItemList
        items={sceneItems}
        selectedId={selectedItemId}
        onSelectItem={handleSelectItem}
        onDeselectAll={handleDeselectAll}
        onDeleteItem={handleDeleteItem}
      />

      {selectedItem ? (
        <>
          <ItemProperties item={selectedItem} />

          <TransformEditor
            selectedItem={selectedItem}
            transform={transform}
            handlePositionChange={handlePositionChange}
            handleRotationChange={handleRotationChange}
            handleScaleChange={handleScaleChange}
          />

          <AttachmentEditor
            selectedItem={selectedItem}
            sceneItems={sceneItems}
            handleAttachToMember={handleAttachToMember}
            handleDetachFromMember={handleDetachFromMember}
          />

          <VariantEditor
            selectedItem={selectedItem}
            getCurrentVariant={getCurrentVariant}
            handleVariantChange={handleVariantChange}
          />

          {selectedItem.type === "puppet" && (
            <MemberEditor
              limbList={limbList}
              selectedLimb={selectedLimb}
              onSelectLimb={handleSelectLimb}
            />
          )}

          {selectedLimb && selectedItem.type === "puppet" && (
            <MemberTransformEditor
              angle={angle}
              onAngleChange={handleAngleChange}
            />
          )}
        </>
      ) : (
        <div className="rounded border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          Select an item from the list above
        </div>
      )}
    </div>
  );
}

export const Inspector = React.memo(InspectorComponent);
