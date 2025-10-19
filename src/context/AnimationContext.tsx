import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { Dispatch, SetStateAction } from "react";
import { SceneItem } from "./UiContext";
import { readItemTransform } from "../utils/svgTransform";

export type AnimationProperty =
  | "rotation"
  | "x"
  | "y"
  | "scaleX"
  | "scaleY"
  | "activeVariant"
  | "attachment"
  | "visible";

type KeyframeValue = number | string | boolean;

export interface AttachedObject {
  type: "image" | "text" | "audio";
  id: string;
}

export interface Keyframe {
  frame: number;
  value: KeyframeValue;
  variant?: string;
  attachedObject?: AttachedObject;
}

export interface AnimationTrack {
  id: string;
  targetId: string; // id of puppet/image
  targetMemberId: string | null; // id of member, or null for whole item
  property: AnimationProperty;
  keyframes: Keyframe[];
}

export interface AnimationState {
  duration: number;
  currentFrame: number;
  tracks: AnimationTrack[];
  playing: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;

  setDuration: (frames: number) => void;
  setCurrentFrame: Dispatch<SetStateAction<number>>;

  addKeyframe: (
    targetId: string,
    targetMemberId: string | null,
    property: AnimationProperty,
    frame: number,
    value: KeyframeValue,
    variant?: string,
    attachedObject?: AttachedObject,
  ) => void;
  removeKeyframe: (trackId: string, frame: number) => void;
  getTrack: (
    targetId: string,
    targetMemberId: string | null,
    property: AnimationProperty,
  ) => AnimationTrack | undefined;
  getValueAtFrame: (
    targetId: string,
    targetMemberId: string | null,
    property: AnimationProperty,
    frame: number,
  ) => KeyframeValue | null;
  removeAllTracksForTarget: (targetId: string) => void;
  snapshotKeyframes: (items: SceneItem[]) => void;
}

const Ctx = createContext<AnimationState | null>(null);

/**
 * Fournit le contexte de l'animation à l'application.
 * Doit englober tous les composants qui utilisent le hook `useAnimation`.
 */
export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [duration, setDuration] = useState(300); // 300 frames = 10s at 30fps
  const [currentFrame, setCurrentFrame] = useState(0);
  const [tracks, setTracks] = useState<AnimationTrack[]>([]);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(-1);

  /**
   * Ajoute ou met à jour une keyframe sur une piste d'animation.
   * Si la piste n'existe pas, elle est créée.
   * @param targetId ID de l'élément de la scène (pantin ou image).
   * @param targetMemberId ID du membre du pantin, ou null si la cible est l'élément entier.
   * @param property Propriété à animer.
   * @param frame Numéro de la frame pour cette keyframe.
   * @param value Valeur de la propriété à cette frame.
   * @param variant Nom du variant (pour la propriété `activeVariant`).
   * @param attachedObject Informations sur l'objet attaché (pour la propriété `attachment`).
   */
  const addKeyframe = useCallback(
    (
      targetId: string,
      targetMemberId: string | null,
      property: AnimationProperty,
      frame: number,
      value: KeyframeValue,
      variant?: string,
      attachedObject?: AttachedObject,
    ) => {
      setTracks((prev) => {
        const trackKey = `${targetId}:${targetMemberId || "null"}:${property}`;
        const trackIndex = prev.findIndex(
          (t) =>
            t.targetId === targetId &&
            t.targetMemberId === targetMemberId &&
            t.property === property,
        );

        const newKeyframe = { frame, value, variant, attachedObject };

        // Create new track if it doesn't exist
        if (trackIndex === -1) {
          return [
            ...prev,
            {
              id: trackKey,
              targetId,
              targetMemberId,
              property,
              keyframes: [newKeyframe],
            },
          ];
        }

        // Update existing track
        const track = prev[trackIndex];
        const existingKfIndex = track.keyframes.findIndex(
          (kf) => kf.frame === frame,
        );

        const updatedKeyframes =
          existingKfIndex >= 0
            ? track.keyframes.map((kf, i) =>
                i === existingKfIndex ? { ...kf, ...newKeyframe } : kf,
              )
            : [...track.keyframes, newKeyframe].sort(
                (a, b) => a.frame - b.frame,
              );

        return [
          ...prev.slice(0, trackIndex),
          { ...track, keyframes: updatedKeyframes },
          ...prev.slice(trackIndex + 1),
        ];
      });
    },
    [],
  );

  /**
   * Supprime une keyframe d'une piste d'animation.
   * Si la piste devient vide, elle est supprimée.
   * @param trackId ID de la piste d'animation.
   * @param frame Numéro de la frame à supprimer.
   */
  const removeKeyframe = useCallback((trackId: string, frame: number) => {
    setTracks((prev) => {
      const trackIndex = prev.findIndex((t) => t.id === trackId);
      if (trackIndex === -1) return prev;

      const track = prev[trackIndex];
      const updatedKeyframes = track.keyframes.filter(
        (kf) => kf.frame !== frame,
      );

      if (updatedKeyframes.length === 0) {
        // Remove track if no keyframes left
        return prev.filter((t) => t.id !== trackId);
      }

      const updatedTrack = { ...track, keyframes: updatedKeyframes };
      return [
        ...prev.slice(0, trackIndex),
        updatedTrack,
        ...prev.slice(trackIndex + 1),
      ];
    });
  }, []);

  const getTrack = useCallback(
    (
      targetId: string,
      targetMemberId: string | null,
      property: AnimationProperty,
    ) => {
      return tracks.find(
        (t) =>
          t.targetId === targetId &&
          t.targetMemberId === targetMemberId &&
          t.property === property,
      );
    },
    [tracks],
  );

  /**
   * Calcule la valeur d'une propriété à une frame donnée, en interpolant entre les keyframes.
   * @param targetId ID de l'élément de la scène.
   * @param targetMemberId ID du membre du pantin, ou null.
   * @param property Propriété à évaluer.
   * @param frame Numéro de la frame à laquelle calculer la valeur.
   * @returns La valeur interpolée, ou null si la piste n'existe pas.
   */
  const getValueAtFrame = useCallback(
    (
      targetId: string,
      targetMemberId: string | null,
      property: AnimationProperty,
      frame: number,
    ): KeyframeValue | null => {
      const track = getTrack(targetId, targetMemberId, property);
      if (!track || track.keyframes.length === 0) return null;

      // Find surrounding keyframes
      const before = track.keyframes
        .filter((kf) => kf.frame <= frame)
        .sort((a, b) => b.frame - a.frame)[0];
      const after = track.keyframes
        .filter((kf) => kf.frame > frame)
        .sort((a, b) => a.frame - b.frame)[0];

      if (!before) return after.value;
      if (!after) return before.value;

      // For variants and attachments, use step interpolation
      if (
        property === "activeVariant" ||
        property === "attachment" ||
        property === "visible"
      ) {
        return before.value;
      }

      // Type guard for interpolation
      if (typeof before.value !== "number" || typeof after.value !== "number") {
        // Should not happen for interpolatable properties, but as a safeguard:
        return before.value;
      }

      // Linear interpolation for numeric properties
      const t = (frame - before.frame) / (after.frame - before.frame);
      if (isNaN(t) || !isFinite(t)) {
        return before.value;
      }
      return before.value + t * (after.value - before.value);
    },
    [getTrack],
  );

  const removeAllTracksForTarget = useCallback((targetId: string) => {
    setTracks((prev) => prev.filter((t) => t.targetId !== targetId));
  }, []);

  // Helper: snapshot item transforms
  const snapshotItemTransform = useCallback(
    (item: SceneItem, currentFrame: number) => {
      const currentTransform = readItemTransform(item.el, item.type);
      const properties = ["x", "y", "rotation", "scaleX", "scaleY"] as const;

      properties.forEach((prop) => {
        if (item.type === "puppet" && prop !== "x" && prop !== "y") return;

        const currentValue = currentTransform[prop];
        const previousValue = getValueAtFrame(
          item.id,
          null,
          prop,
          currentFrame - 1,
        );

        if (
          currentFrame === 0 ||
          previousValue === null ||
          Math.abs((currentValue as number) - (previousValue as number)) > 1e-4
        ) {
          addKeyframe(item.id, null, prop, currentFrame, currentValue);
        }
      });
    },
    [getValueAtFrame, addKeyframe],
  );

  // Helper: snapshot item visibility
  const snapshotItemVisibility = useCallback(
    (item: SceneItem, currentFrame: number) => {
      const el = item.el as SVGGraphicsElement;
      const displayAttr = el.getAttribute("display");
      const styleDisplay = el.style?.display || "";
      const isVisible = displayAttr !== "none" && styleDisplay !== "none";
      const prevVisible = getValueAtFrame(
        item.id,
        null,
        "visible",
        currentFrame - 1,
      );

      if (
        currentFrame === 0 ||
        prevVisible === null ||
        Boolean(prevVisible) !== isVisible
      ) {
        addKeyframe(item.id, null, "visible", currentFrame, isVisible);
      }
    },
    [getValueAtFrame, addKeyframe],
  );

  // Helper: snapshot puppet member rotations
  const snapshotPuppetMembers = useCallback(
    (item: SceneItem, currentFrame: number) => {
      if (item.type !== "puppet") return;

      const puppetRoot = item.el.firstChild as SVGGElement | null;
      if (!puppetRoot) return;

      const members = puppetRoot.querySelectorAll(
        "[data-membre]",
      ) as NodeListOf<SVGGElement>;
      members.forEach((memberEl) => {
        const memberId = memberEl.id;
        const transformStyle = memberEl.style.transform || "";
        const match = transformStyle.match(/rotate\(([-\d.]+)deg\)/);
        const currentValue = match ? parseFloat(match[1] || "0") : 0;
        const previousValue = getValueAtFrame(
          item.id,
          memberId,
          "rotation",
          currentFrame - 1,
        );

        if (
          currentFrame === 0 ||
          previousValue === null ||
          Math.abs(currentValue - (previousValue as number)) > 1e-4
        ) {
          addKeyframe(
            item.id,
            memberId,
            "rotation",
            currentFrame,
            currentValue,
          );
        }
      });
    },
    [getValueAtFrame, addKeyframe],
  );

  // Helper: snapshot puppet variants
  const snapshotPuppetVariants = useCallback(
    (item: SceneItem, currentFrame: number) => {
      if (item.type !== "puppet" || !item.metadata) return;

      const puppetRoot = item.el.firstChild as SVGGElement | null;
      if (!puppetRoot) return;

      item.metadata.variantGroups.forEach((group) => {
        const targetMemberId = group.variants[0]?.targetMemberId;
        if (!targetMemberId) return;

        const targetMember = puppetRoot.querySelector(
          `#${CSS.escape(targetMemberId)}`,
        ) as SVGGElement | null;
        if (!targetMember) return;

        // Find active variant by checking visibility
        const activeVariant = group.variants.find((variant) => {
          if (!variant.name) return false;

          const variantEl = Array.from(targetMember.children).find(
            (child) =>
              child.getAttribute("data-variant-groupe") === group.group &&
              child.getAttribute("data-variant-name") === variant.name,
          ) as SVGElement | null;

          return (
            variantEl &&
            variantEl.style.display !== "none" &&
            variantEl.getAttribute("display") !== "none"
          );
        });

        if (activeVariant?.name) {
          const previousValue = getValueAtFrame(
            item.id,
            group.group,
            "activeVariant",
            currentFrame - 1,
          );
          if (currentFrame === 0 || previousValue !== activeVariant.name) {
            addKeyframe(
              item.id,
              group.group,
              "activeVariant",
              currentFrame,
              activeVariant.name,
            );
          }
        }
      });
    },
    [getValueAtFrame, addKeyframe],
  );

  // Helper: snapshot image attachments
  const snapshotImageAttachment = useCallback(
    (item: SceneItem, currentFrame: number) => {
      if (item.type !== "image") return;

      const imageEl = item.el as SVGGraphicsElement;
      const attachedPuppetId = imageEl.getAttribute("data-attached-to-puppet");
      const attachedMemberId = imageEl.getAttribute("data-attached-to-member");

      const currentValue = attachedPuppetId
        ? `${attachedPuppetId}:${attachedMemberId}`
        : null;
      const previousValue = getValueAtFrame(
        item.id,
        null,
        "attachment",
        currentFrame - 1,
      );

      if (currentFrame === 0 || previousValue !== currentValue) {
        addKeyframe(
          item.id,
          null,
          "attachment",
          currentFrame,
          currentValue || "",
        );
      }
    },
    [getValueAtFrame, addKeyframe],
  );

  /**
   * Capture l'état actuel des éléments de la scène et crée des keyframes si nécessaire.
   * Compare l'état actuel à la frame précédente pour ne créer des keyframes que si des changements ont eu lieu.
   * @param items Tableau des éléments de la scène à capturer.
   */
  const snapshotKeyframes = useCallback(
    (items: SceneItem[]) => {
      items.forEach((item) => {
        snapshotItemTransform(item, currentFrame);
        snapshotItemVisibility(item, currentFrame);
        snapshotPuppetMembers(item, currentFrame);
        snapshotPuppetVariants(item, currentFrame);
        snapshotImageAttachment(item, currentFrame);
      });
    },
    [
      currentFrame,
      snapshotItemTransform,
      snapshotItemVisibility,
      snapshotPuppetMembers,
      snapshotPuppetVariants,
      snapshotImageAttachment,
    ],
  );

  // Playback animation loop
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    // Capture current frame at play start
    const startFrame = currentFrame;
    startTimeRef.current = performance.now() - (startFrame * 1000) / 30; // 30 fps
    lastFrameRef.current = startFrame;

    const loop = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const frame = Math.max(0, Math.floor((elapsed / 1000) * 30)); // 30 fps, never negative

      if (frame >= duration) {
        setCurrentFrame(0);
        setPlaying(false);
        return;
      }

      if (frame !== lastFrameRef.current) {
        lastFrameRef.current = frame;
        setCurrentFrame(frame);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration]); // currentFrame removed from deps to avoid recalculation

  // Listen for project load events
  useEffect(() => {
    const handleProjectLoad = (e: Event) => {
      const projectData = (e as CustomEvent).detail;

      // Clear current animation
      setTracks([]);
      setCurrentFrame(0);

      // Load animation data
      if (projectData.animation) {
        setDuration(projectData.animation.duration);
        setTracks(projectData.animation.tracks);
      }
      setPlaying(false); // Stop playback on load
    };

    window.addEventListener("project:load", handleProjectLoad);
    return () => window.removeEventListener("project:load", handleProjectLoad);
  }, []);

  const value = useMemo(
    () => ({
      duration,
      currentFrame,
      tracks,
      playing,
      setPlaying,
      setDuration,
      setCurrentFrame,
      addKeyframe,
      removeKeyframe,
      getTrack,
      getValueAtFrame,
      removeAllTracksForTarget,
      snapshotKeyframes,
    }),
    [
      duration,
      currentFrame,
      tracks,
      playing,
      addKeyframe,
      removeKeyframe,
      getTrack,
      getValueAtFrame,
      removeAllTracksForTarget,
      snapshotKeyframes,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

/**
 * Hook pour accéder à l'état et aux actions de l'animation.
 * Gère les pistes, les keyframes, la lecture et les snapshots.
 *
 * @example
 * const { addKeyframe, getValueAtFrame } = useAnimation();
 * addKeyframe('puppet-1', 'arm', 'rotation', 30, 45);
 *
 * @see {@link AnimationTrack} for track structure
 */
export const useAnimation = () => {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useAnimation must be used within AnimationProvider");
  return ctx;
};
