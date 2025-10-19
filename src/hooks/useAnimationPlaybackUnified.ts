import { useEffect, useCallback } from "react";
import { useAnimation } from "../context/AnimationContext";
import { SceneItem, useUi } from "../context/UiContext";
import { perfMonitor } from "../utils/performanceMonitor";
import {
  setRotationWithOrigin,
  setImageTransform,
  parseTransformAttribute,
} from "../utils/svgTransform";
import { parseNumber } from "../utils/numbers";
import { applyVariantSelection, findVisibleVariant } from "../utils/svgVariants";
import {
  embedAttachmentIntoMember,
  releaseAttachmentFromMember,
} from "../utils/attachment";

/**
 * Unified animation playback hook that applies all animation properties to the DOM.
 * This replaces the separate useVisibilityAnimation, useTransformAnimation,
 * useVariantAnimation, and useAttachmentAnimation hooks to ensure consistent
 * state reads and prevent race conditions.
 */
export const useAnimationPlaybackUnified = () => {
  const { currentFrame, getValueAtFrame, tracks, recording } = useAnimation();
  const { sceneItems } = useUi();

  const clearAttachmentAttributes = useCallback((imageEl: SVGGraphicsElement) => {
    if (imageEl.getAttribute("data-attached-mode") === "embedded") {
      releaseAttachmentFromMember(imageEl);
    }
    imageEl.removeAttribute("data-attached-to-puppet");
    imageEl.removeAttribute("data-attached-to-member");
    imageEl.removeAttribute("data-attachment-offset-cx");
    imageEl.removeAttribute("data-attachment-offset-cy");
  }, []);

  useEffect(() => {
    perfMonitor.startMeasure("playback-frame");

    // Skip playback if in recording mode - manual edits take precedence
    if (recording) {
      perfMonitor.endMeasure("playback-frame");
      return;
    }

    // Use requestAnimationFrame to batch DOM updates in a single browser frame
    // This prevents layout thrashing and improves smoothness
    const rafId = requestAnimationFrame(() => {
      // Collect all updates from tracks in a single pass
      const updates = {
        visibility: new Map<string, boolean>(),
        transforms: new Map<string, Record<string, number>>(),
        variants: new Map<string, { group: string; value: string; item: SceneItem }>(),
        attachments: new Map<string, string>(),
      };

    // Single iteration over tracks to collect all animation values
    tracks.forEach((track) => {
      const value = getValueAtFrame(
        track.targetId,
        track.targetMemberId,
        track.property,
        currentFrame
      );

      if (value === null) return;

      switch (track.property) {
        case "visible":
          if (track.targetMemberId === null) {
            updates.visibility.set(track.targetId, Boolean(value));
          }
          break;

        case "x":
        case "y":
        case "rotation":
        case "scaleX":
        case "scaleY": {
          const numericValue = typeof value === "number" ? value : parseFloat(String(value));
          if (!isNaN(numericValue)) {
            const targetKey = `${track.targetId}:${track.targetMemberId || "null"}`;
            const existing = updates.transforms.get(targetKey) ?? {};
            existing[track.property] = numericValue;
            updates.transforms.set(targetKey, existing);
          }
          break;
        }

        case "activeVariant":
          if (typeof value === "string" && track.targetMemberId) {
            const item = sceneItems.find((i) => i.id === track.targetId);
            if (item && item.type === "puppet") {
              updates.variants.set(`${track.targetId}:${track.targetMemberId}`, {
                group: track.targetMemberId,
                value,
                item,
              });
            }
          }
          break;

        case "attachment":
          if (track.targetMemberId === null) {
            updates.attachments.set(track.targetId, String(value));
          }
          break;
      }
    });

    // Apply visibility updates
    sceneItems.forEach((item) => {
      const el = item.el as SVGGraphicsElement;
      const visible = updates.visibility.has(item.id)
        ? updates.visibility.get(item.id)!
        : !updates.visibility.size; // Default: visible if no visibility tracks exist

      el.setAttribute("data-visibility-state", visible ? "visible" : "hidden");
      if (visible) {
        el.removeAttribute("display");
        el.style.display = "";
      } else {
        el.setAttribute("display", "none");
        el.style.display = "none";
      }
    });

    // Apply transform updates
    updates.transforms.forEach((transforms, targetKey) => {
      const [targetId, memberIdStr] = targetKey.split(":");
      const memberId = memberIdStr === "null" ? null : memberIdStr;
      const item = sceneItems.find((i) => i.id === targetId);
      if (!item) return;

      if (memberId && item.type === "puppet") {
        // Apply rotation to puppet member
        const puppetRoot = item.el.firstChild as SVGGElement | null;
        if (puppetRoot) {
          const memberEl = puppetRoot.querySelector(
            `#${CSS.escape(memberId)}`
          ) as SVGGElement | null;
          if (memberEl && transforms.rotation !== undefined) {
            setRotationWithOrigin(memberEl, transforms.rotation);
          }
        }
      } else if (!memberId) {
        // Apply transform to whole item
        if (item.type === "puppet") {
          const parsed = parseTransformAttribute(item.el);
          const x = transforms.x ?? parsed.translate?.x ?? 0;
          const y = transforms.y ?? parsed.translate?.y ?? 0;
          item.el.setAttribute("transform", `translate(${x}, ${y})`);
        } else {
          const imgEl = item.el as SVGGraphicsElement;
          const x = transforms.x ?? parseNumber(imgEl.getAttribute("x"), 0);
          const y = transforms.y ?? parseNumber(imgEl.getAttribute("y"), 0);
          imgEl.setAttribute("x", String(x));
          imgEl.setAttribute("y", String(y));

          const parsed = parseTransformAttribute(imgEl);
          const rotation = transforms.rotation ?? parsed.rotate ?? 0;
          const scaleX = transforms.scaleX ?? parsed.scale?.x ?? 1;
          const scaleY = transforms.scaleY ?? parsed.scale?.y ?? 1;
          setImageTransform(imgEl, rotation, scaleX, scaleY);
        }
      }
    });

    // Apply variant updates
    updates.variants.forEach(({ group, value, item }) => {
      const puppetRoot = item.el.firstChild as SVGGElement | null;
      if (puppetRoot) {
        const variantGroup = item.metadata?.variantGroups.find((g) => g.group === group);
        if (variantGroup) {
          applyVariantSelection(puppetRoot, variantGroup, value);
        }
      }
    });

    // Apply attachment updates
    const puppets = new Map<string, { anchor: SVGGElement; item: SceneItem }>();
    sceneItems.forEach((item) => {
      if (item.type === "puppet") {
        puppets.set(item.id, { anchor: item.el as SVGGElement, item });
      }
    });

    updates.attachments.forEach((value, targetId) => {
      const item = sceneItems.find((i) => i.id === targetId);
      if (item && item.type === "image") {
        const imageEl = item.el as SVGGraphicsElement;

        if (!value.includes(":")) {
          clearAttachmentAttributes(imageEl);
        } else {
          const [puppetId, memberId] = value.split(":");
          const puppetEntry = puppets.get(puppetId);
          if (puppetEntry) {
            const puppetRoot = puppetEntry.anchor.firstChild as SVGGElement | null;
            const member = puppetRoot ? findVisibleVariant(puppetRoot, memberId) : null;
            if (member) {
              const currentPuppet = imageEl.getAttribute("data-attached-to-puppet");
              const currentMember = imageEl.getAttribute("data-attached-to-member");
              if (currentPuppet !== puppetId || currentMember !== memberId) {
                if (imageEl.getAttribute("data-attached-mode") === "embedded") {
                  releaseAttachmentFromMember(imageEl);
                }
                const embedded = embedAttachmentIntoMember({
                  element: imageEl,
                  member,
                  anchor: puppetEntry.anchor,
                });
                if (embedded) {
                  imageEl.setAttribute("data-attached-to-puppet", puppetId);
                  imageEl.setAttribute("data-attached-to-member", memberId);
                  imageEl.removeAttribute("data-attachment-offset-cx");
                  imageEl.removeAttribute("data-attachment-offset-cy");
                }
              }
            }
          }
        }
      }
    });

      perfMonitor.endMeasure("playback-frame");
    });

    // Cleanup: cancel RAF if effect re-runs before completion
    return () => cancelAnimationFrame(rafId);
  }, [currentFrame, tracks, sceneItems, getValueAtFrame, clearAttachmentAttributes, recording]);
};
