import { useEffect } from "react";
import { useAnimation } from "../context/AnimationContext";
import { useUi } from "../context/UiContext";
import {
  setRotationWithOrigin,
  setImageTransform,
  parseTransformAttribute,
} from "../utils/svgTransform";
import { parseNumber } from "../utils/numbers";

export const useTransformAnimation = () => {
  const { currentFrame, getValueAtFrame, tracks } = useAnimation();
  const { sceneItems } = useUi();

  useEffect(() => {
    const targetTransforms = new Map<string, Record<string, number>>();

    tracks.forEach((track) => {
      switch (track.property) {
        case "x":
        case "y":
        case "rotation":
        case "scaleX":
        case "scaleY": {
          const value = getValueAtFrame(track.targetId, track.targetMemberId, track.property, currentFrame);
          const numericValue = typeof value === "number" ? value : parseFloat(String(value));
          if (!isNaN(numericValue)) {
            const targetKey = `${track.targetId}:${track.targetMemberId || "null"}`;
            const existing = targetTransforms.get(targetKey) ?? {};
            existing[track.property] = numericValue;
            targetTransforms.set(targetKey, existing);
          }
          break;
        }
      }
    });

    targetTransforms.forEach((transforms, targetKey) => {
      const [targetId, memberIdStr] = targetKey.split(":");
      const memberId = memberIdStr === "null" ? null : memberIdStr;
      const item = sceneItems.find((i) => i.id === targetId);
      if (!item) return;

      if (memberId && item.type === "puppet") {
        const puppetRoot = item.el.firstChild as SVGGElement | null;
        if (puppetRoot) {
          const memberEl = puppetRoot.querySelector(`#${CSS.escape(memberId)}`) as SVGGElement | null;
          if (memberEl && transforms.rotation !== undefined) {
            setRotationWithOrigin(memberEl, transforms.rotation);
          }
        }
      } else if (!memberId) {
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
  }, [currentFrame, tracks, sceneItems, getValueAtFrame]);
};
