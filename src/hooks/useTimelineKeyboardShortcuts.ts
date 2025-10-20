import { useEffect, useRef } from "react";
import { useAnimation } from "../context/AnimationContext";
import type { TimelineKeyframe } from "./useTimelineData";

interface UseTimelineKeyboardShortcutsProps {
  selectedKeyframeIds: Set<string>;
  setSelectedKeyframeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  allKeyframes: TimelineKeyframe[];
  duration: number;
  isTimelineVisible: boolean;
}

/**
 * Helper pour parser l'ID d'une keyframe (format: trackId:frame)
 */
function parseKeyframeId(id: string): { trackId: string; frame: number } | null {
  const parts = id.split(":");
  if (parts.length !== 2) return null;
  const frame = parseInt(parts[1], 10);
  if (!Number.isFinite(frame)) return null;
  return { trackId: parts[0], frame };
}

/**
 * Hook pour gérer les raccourcis clavier spécifiques à la Timeline
 * Gère: Delete, Ctrl+D (duplicate), Ctrl+A (select all), Arrow keys (nudge)
 */
export function useTimelineKeyboardShortcuts({
  selectedKeyframeIds,
  setSelectedKeyframeIds,
  allKeyframes,
  duration,
  isTimelineVisible,
}: UseTimelineKeyboardShortcutsProps) {
  const { removeKeyframe, addKeyframe, tracks } = useAnimation();

  const selectedKeyframeIdsRef = useRef(selectedKeyframeIds);
  const allKeyframesRef = useRef(allKeyframes);
  const durationRef = useRef(duration);
  const setSelectedKeyframeIdsRef = useRef(setSelectedKeyframeIds);
  const removeKeyframeRef = useRef(removeKeyframe);
  const addKeyframeRef = useRef(addKeyframe);
  const tracksRef = useRef(tracks);

  useEffect(() => {
    selectedKeyframeIdsRef.current = selectedKeyframeIds;
  }, [selectedKeyframeIds]);

  useEffect(() => {
    allKeyframesRef.current = allKeyframes;
  }, [allKeyframes]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    setSelectedKeyframeIdsRef.current = setSelectedKeyframeIds;
  }, [setSelectedKeyframeIds]);

  useEffect(() => {
    removeKeyframeRef.current = removeKeyframe;
  }, [removeKeyframe]);

  useEffect(() => {
    addKeyframeRef.current = addKeyframe;
  }, [addKeyframe]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    // Ne gérer les raccourcis que si la Timeline est visible
    if (!isTimelineVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const selection = selectedKeyframeIdsRef.current;
      const keyframes = allKeyframesRef.current;
      const currentDuration = durationRef.current;
      const selectionSetter = setSelectedKeyframeIdsRef.current;
      const remove = removeKeyframeRef.current;
      const add = addKeyframeRef.current;
      const currentTracks = tracksRef.current;

      // Ignorer si l'utilisateur tape dans un input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignorer si aucune keyframe n'est sélectionnée (sauf pour Ctrl+A)
      const hasSelection = selection.size > 0;
      if (!hasSelection && e.key !== "a" && !e.ctrlKey && !e.metaKey) {
        return;
      }

      // Delete - Supprimer les keyframes sélectionnées
      if (e.key === "Delete" && hasSelection) {
        e.preventDefault();

        // Parser chaque ID et supprimer les keyframes
        Array.from(selection).forEach((id) => {
          const parsed = parseKeyframeId(id);
          if (parsed) {
            remove(parsed.trackId, parsed.frame);
          }
        });

        selectionSetter(new Set());
        return;
      }

      // Ctrl/Cmd + D - Dupliquer les keyframes sélectionnées
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && hasSelection) {
        e.preventDefault();

        const selectedKfs = keyframes.filter((kf) => selection.has(kf.id));

        // Dupliquer chaque keyframe en l'ajoutant 1 frame plus loin
        const newIds = new Set<string>();
        selectedKfs.forEach((kf) => {
          const newFrame = Math.min(kf.frame + 1, currentDuration - 1);

          // Trouver le track correspondant pour récupérer les infos nécessaires
          const track = currentTracks.find((t) => t.id === kf.trackId);
          if (!track) return;

          add(
            track.targetId,
            track.targetMemberId,
            track.property,
            newFrame,
            kf.value
          );

          // Le trackId est le même que l'original
          newIds.add(`${kf.trackId}:${newFrame}`);
        });

        // Sélectionner les nouvelles keyframes
        selectionSetter(newIds);
        return;
      }

      // Ctrl/Cmd + A - Sélectionner toutes les keyframes du track actuel
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();

        // Sélectionner toutes les keyframes disponibles
        const allIds = new Set(keyframes.map((kf) => kf.id));
        selectionSetter(allIds);
        return;
      }

      // Arrow keys - Nudge keyframes
      if (hasSelection && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();

        const direction = e.key === "ArrowRight" ? 1 : -1;
        const amount = e.shiftKey ? 10 : 1; // Shift = ±10 frames, sinon ±1
        const offset = direction * amount;

        const selectedKfs = keyframes.filter((kf) => selection.has(kf.id));

        // Mettre à jour chaque keyframe sélectionnée (supprimer + ajouter)
        const newIds = new Set<string>();
        selectedKfs.forEach((kf) => {
          const newFrame = Math.max(0, Math.min(kf.frame + offset, currentDuration - 1));

          // Ne rien faire si la frame ne change pas
          if (newFrame === kf.frame) {
            newIds.add(kf.id);
            return;
          }

          // Trouver le track
          const track = currentTracks.find((t) => t.id === kf.trackId);
          if (!track) return;

          // Supprimer l'ancienne keyframe
          const parsed = parseKeyframeId(kf.id);
          if (parsed) {
            remove(parsed.trackId, parsed.frame);
          }

          // Ajouter la nouvelle keyframe
          add(
            track.targetId,
            track.targetMemberId,
            track.property,
            newFrame,
            kf.value
          );

          // Le trackId reste le même
          newIds.add(`${kf.trackId}:${newFrame}`);
        });

        // Mettre à jour la sélection avec les nouveaux IDs
        selectionSetter(newIds);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTimelineVisible]);
}
