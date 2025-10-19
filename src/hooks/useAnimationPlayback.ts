import { useVisibilityAnimation } from "./useVisibilityAnimation";
import { useTransformAnimation } from "./useTransformAnimation";
import { useVariantAnimation } from "./useVariantAnimation";
import { useAttachmentAnimation } from "./useAttachmentAnimation";

/**
 * Hook principal pour l'application de l'état de l'animation au DOM.
 * Compose plusieurs hooks spécialisés pour gérer chaque aspect de l'animation.
 */
export const useAnimationPlayback = () => {
  useVisibilityAnimation();
  useVariantAnimation();
  useTransformAnimation();
  useAttachmentAnimation();
};