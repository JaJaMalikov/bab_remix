import { useAnimationPlaybackUnified } from "./useAnimationPlaybackUnified";

/**
 * Hook principal pour l'application de l'état de l'animation au DOM.
 * Utilise un hook unifié pour garantir la cohérence des lectures d'état
 * et éviter les race conditions entre les différents aspects de l'animation.
 *
 * Ancienne implémentation: 4 hooks séparés (useVisibilityAnimation, useTransformAnimation,
 * useVariantAnimation, useAttachmentAnimation) qui pouvaient lire des versions différentes
 * de l'état tracks si celui-ci changeait pendant l'exécution.
 *
 * Nouvelle implémentation: Un seul hook qui lit tracks une fois et applique toutes les
 * mises à jour de manière atomique.
 */
export const useAnimationPlayback = () => {
  useAnimationPlaybackUnified();
};