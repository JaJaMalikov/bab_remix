import { useEffect, useCallback, useMemo, useRef } from "react";
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

interface AppliedTransformState {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

/**
 * Unified animation playback hook that applies all animation properties to the DOM.
 * This replaces the separate useVisibilityAnimation, useTransformAnimation,
 * useVariantAnimation, and useAttachmentAnimation hooks to ensure consistent
 * state reads and prevent race conditions.
 */
export const useAnimationPlaybackUnified = () => {
  const { currentFrame, getValueAtFrame, tracks, recording } = useAnimation();
  const { sceneItems } = useUi();

  const sceneItemMap = useMemo(() => {
    const map = new Map<string, SceneItem>();
    sceneItems.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [sceneItems]);

  const visibilityStateRef = useRef(new Map<string, boolean>());
  const transformStateRef = useRef(new Map<string, AppliedTransformState>());
  const variantStateRef = useRef(new Map<string, string>());
  const attachmentStateRef = useRef(new Map<string, string>());

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

    if (recording) {
      perfMonitor.endMeasure("playback-frame");
      return;
    }

    const rafId = requestAnimationFrame(() => {
      const updates = {
        visibility: new Map<string, boolean>(),
        transforms: new Map<string, Partial<AppliedTransformState>>(),
        variants: new Map<string, { group: string; value: string }>(),
        attachments: new Map<string, string>(),
      };

      tracks.forEach((track) => {
        const value = getValueAtFrame(
          track.targetId,
          track.targetMemberId,
          track.property,
          currentFrame,
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
            const numericValue =
              typeof value === "number" ? value : parseFloat(String(value));
            if (!Number.isFinite(numericValue)) {
              return;
            }
            const targetKey = `${track.targetId}:${track.targetMemberId ?? "null"}`;
            const existing = updates.transforms.get(targetKey) ?? {};
            existing[track.property] = numericValue;
            updates.transforms.set(targetKey, existing);
            break;
          }
          case "activeVariant":
            if (typeof value === "string" && track.targetMemberId) {
              updates.variants.set(`${track.targetId}:${track.targetMemberId}`, {
                group: track.targetMemberId,
                value,
              });
            }
            break;
          case "attachment":
            if (track.targetMemberId === null) {
              updates.attachments.set(track.targetId, String(value));
            }
            break;
        }
      });

      sceneItemMap.forEach((item, itemId) => {
        const previous = visibilityStateRef.current.get(itemId);
        const next = updates.visibility.has(itemId)
          ? updates.visibility.get(itemId)!
          : previous ?? true;

        if (previous !== next) {
          visibilityStateRef.current.set(itemId, next);
          const el = item.el as SVGGraphicsElement;
          el.setAttribute("data-visibility-state", next ? "visible" : "hidden");
          if (next) {
            el.removeAttribute("display");
            el.style.display = "";
          } else {
            el.setAttribute("display", "none");
            el.style.display = "none";
          }
        } else if (previous === undefined) {
          visibilityStateRef.current.set(itemId, next);
        }
      });

      updates.transforms.forEach((transforms, targetKey) => {
        const [targetId, memberIdStr] = targetKey.split(":");
        const memberId = memberIdStr === "null" ? null : memberIdStr;
        const item = sceneItemMap.get(targetId);
        if (!item) return;

        if (memberId && item.type === "puppet") {
          if (transforms.rotation === undefined) {
            return;
          }
          const state = transformStateRef.current.get(targetKey) ?? {};
          if (state.rotation === transforms.rotation) {
            return;
          }
          const puppetRoot = item.el.firstChild as SVGGElement | null;
          if (!puppetRoot) return;
          const memberEl = puppetRoot.querySelector(
            `#${CSS.escape(memberId)}`,
          ) as SVGGElement | null;
          if (!memberEl) return;
          setRotationWithOrigin(memberEl, transforms.rotation);
          transformStateRef.current.set(targetKey, {
            ...state,
            rotation: transforms.rotation,
          });
          return;
        }

        if (memberId) {
          return;
        }

        if (item.type === "puppet") {
          const existing = transformStateRef.current.get(targetKey);
          const state = existing ?? (() => {
            const parsed = parseTransformAttribute(item.el as SVGGraphicsElement);
            const initialState: AppliedTransformState = {
              x: parsed.translate?.x ?? 0,
              y: parsed.translate?.y ?? 0,
            };
            transformStateRef.current.set(targetKey, initialState);
            return initialState;
          })();

          const nextX = transforms.x ?? state.x ?? 0;
          const nextY = transforms.y ?? state.y ?? 0;

          if (nextX !== state.x || nextY !== state.y) {
            (item.el as SVGGraphicsElement).setAttribute(
              "transform",
              `translate(${nextX}, ${nextY})`,
            );
            state.x = nextX;
            state.y = nextY;
          }
          return;
        }

        const imgEl = item.el as SVGGraphicsElement;
        const existing = transformStateRef.current.get(targetKey);
        const state = existing ?? (() => {
          const initialState: AppliedTransformState = {
            x: parseNumber(imgEl.getAttribute("x"), 0),
            y: parseNumber(imgEl.getAttribute("y"), 0),
          };
          const parsed = parseTransformAttribute(imgEl);
          initialState.rotation = parsed.rotate ?? 0;
          initialState.scaleX = parsed.scale?.x ?? 1;
          initialState.scaleY = parsed.scale?.y ?? 1;
          transformStateRef.current.set(targetKey, initialState);
          return initialState;
        })();

        const nextX = transforms.x ?? state.x ?? 0;
        const nextY = transforms.y ?? state.y ?? 0;

        if (nextX !== state.x) {
          imgEl.setAttribute("x", String(nextX));
          state.x = nextX;
        }
        if (nextY !== state.y) {
          imgEl.setAttribute("y", String(nextY));
          state.y = nextY;
        }

        const nextRotation = transforms.rotation ?? state.rotation ?? 0;
        const nextScaleX = transforms.scaleX ?? state.scaleX ?? 1;
        const nextScaleY = transforms.scaleY ?? state.scaleY ?? 1;

        if (
          nextRotation !== state.rotation ||
          nextScaleX !== state.scaleX ||
          nextScaleY !== state.scaleY
        ) {
          setImageTransform(imgEl, nextRotation, nextScaleX, nextScaleY);
          state.rotation = nextRotation;
          state.scaleX = nextScaleX;
          state.scaleY = nextScaleY;
        }
      });

      updates.variants.forEach((variant, key) => {
        const [targetId, group] = key.split(":");
        const item = sceneItemMap.get(targetId);
        if (!item || item.type !== "puppet") return;

        const previous = variantStateRef.current.get(key);
        if (previous === variant.value) {
          return;
        }

        const puppetRoot = item.el.firstChild as SVGGElement | null;
        if (!puppetRoot) return;

        const variantGroup = item.metadata?.variantGroups.find(
          (variantDef) => variantDef.group === group,
        );
        if (!variantGroup) return;

        applyVariantSelection(puppetRoot, variantGroup, variant.value);
        variantStateRef.current.set(key, variant.value);
      });

      const puppets = new Map<string, { anchor: SVGGElement; item: SceneItem }>();
      sceneItemMap.forEach((item) => {
        if (item.type === "puppet") {
          puppets.set(item.id, { anchor: item.el as SVGGElement, item });
        }
      });

      updates.attachments.forEach((value, targetId) => {
        const item = sceneItemMap.get(targetId);
        if (!item || item.type !== "image") return;

        const imageEl = item.el as SVGGraphicsElement;
        const previous = attachmentStateRef.current.get(targetId);

        if (!value.includes(":")) {
          if (previous !== undefined) {
            clearAttachmentAttributes(imageEl);
            attachmentStateRef.current.delete(targetId);
          }
          return;
        }

        if (previous === value) {
          return;
        }

        const [puppetId, memberId] = value.split(":");
        const puppetEntry = puppets.get(puppetId);
        if (!puppetEntry) return;

        const puppetRoot = puppetEntry.anchor.firstChild as SVGGElement | null;
        const member = puppetRoot ? findVisibleVariant(puppetRoot, memberId) : null;
        if (!member) return;

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
          attachmentStateRef.current.set(targetId, value);
        }
      });

      perfMonitor.endMeasure("playback-frame");
    });

    return () => cancelAnimationFrame(rafId);
  }, [
    currentFrame,
    tracks,
    sceneItemMap,
    getValueAtFrame,
    clearAttachmentAttributes,
    recording,
  ]);
};
