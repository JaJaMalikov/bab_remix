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
import { EASINGS, linear } from "../utils/easings";

export type AnimationProperty =
  | "rotation"
  | "x"
  | "y"
  | "scaleX"
  | "scaleY"
  | "activeVariant"
  | "attachment"
  | "visible";

export type KeyframeValue = number | string | boolean;

export interface AttachedObject {
  type: "image" | "text" | "audio";
  id: string;
}

export interface Keyframe {
  frame: number;
  value: number | boolean | string;
  easing?: string;
}

export interface AnimationTrack {
  id: string;
  targetId: string; // id of puppet/image
  targetMemberId: string | null; // id of member, or null for whole item
  property: AnimationProperty;
  keyframes: Keyframe[];
}

export interface KeyframeMutation {
  trackId: string;
  from: number;
  to: number;
  keyframe: Keyframe;
}

export interface AnimationState {
  duration: number;
  fps: number;
  currentFrame: number;
  tracks: AnimationTrack[];
  playing: boolean;
  recording: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;
  setRecording: Dispatch<SetStateAction<boolean>>;

  setDuration: (frames: number) => void;
  setFps: (fps: number) => void;
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
  moveKeyframes: (mutations: KeyframeMutation[]) => void;
  duplicateKeyframes: (mutations: KeyframeMutation[]) => void;
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
 * Precision thresholds for detecting meaningful changes when snapshotting keyframes.
 * These prevent creating unnecessary keyframes for imperceptible changes while ensuring
 * significant changes are captured.
 */
const PRECISION_THRESHOLDS = {
  rotation: 0.1,      // 0.1 degree - smaller changes are imperceptible
  x: 0.5,             // 0.5 pixel - sub-pixel rendering makes smaller changes invisible
  y: 0.5,             // 0.5 pixel
  scaleX: 0.001,      // 0.1% scale change
  scaleY: 0.001,      // 0.1% scale change
} as const;

/**
 * Fournit le contexte de l'animation à l'application.
 * Doit englober tous les composants qui utilisent le hook `useAnimation`.
 */
export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [duration, setDuration] = useState(300); // 300 frames = 10s at 30fps
  const [fps, setFps] = useState(30);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [tracks, setTracks] = useState<AnimationTrack[]>([]);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
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
        const trackKey = `${targetId}:${targetMemberId ?? "null"}:${property}`;
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
    const removeKeyframe = useCallback(
      (trackId: string, frame: number) => {
        setTracks((prevTracks) => {
          const trackIndex = prevTracks.findIndex((t) => t.id === trackId);
          if (trackIndex === -1) return prevTracks;

          const track = { ...prevTracks[trackIndex] };
          track.keyframes = track.keyframes.filter((kf) => kf.frame !== frame);

          if (track.keyframes.length === 0) {
            return prevTracks.filter((_, i) => i !== trackIndex);
          }

          const newTracks = [...prevTracks];
          newTracks[trackIndex] = track;
          return newTracks;
        });
      },
      [],
    );

  const moveKeyframes = useCallback((mutations: KeyframeMutation[]) => {
    if (mutations.length === 0) return;

    const grouped = mutations.reduce<Map<string, KeyframeMutation[]>>(
      (map, mutation) => {
        const list = map.get(mutation.trackId) ?? [];
        list.push(mutation);
        map.set(mutation.trackId, list);
        return map;
      },
      new Map(),
    );

    setTracks((prev) =>
      prev
        .map((track) => {
          const trackMutations = grouped.get(track.id);
          if (!trackMutations || trackMutations.length === 0) {
            return track;
          }

          const framesToRemove = new Set<number>();
          trackMutations.forEach(({ from, to }) => {
            framesToRemove.add(from);
            framesToRemove.add(to);
          });

          const preserved = track.keyframes.filter(
            (kf) => !framesToRemove.has(kf.frame),
          );
          const moved = trackMutations.map(({ keyframe, to }) => ({
            ...keyframe,
            frame: to,
          }));

          const nextKeyframes = [...preserved, ...moved].sort(
            (a, b) => a.frame - b.frame,
          );

          return nextKeyframes.length > 0
            ? { ...track, keyframes: nextKeyframes }
            : null;
        })
        .filter((track): track is AnimationTrack => Boolean(track)),
    );
  }, []);

  const duplicateKeyframes = useCallback((mutations: KeyframeMutation[]) => {
    if (mutations.length === 0) return;

    setTracks((prev) =>
      prev.map((track) => {
        const relevant = mutations.filter(
          (mutation) => mutation.trackId === track.id,
        );
        if (relevant.length === 0) return track;

        const framesToReplace = new Set<number>(
          relevant.map((mutation) => mutation.to),
        );

        const preserved = track.keyframes.filter(
          (kf) => !framesToReplace.has(kf.frame),
        );

        const duplicated = relevant.map((mutation) => ({
          ...mutation.keyframe,
          frame: mutation.to,
        }));

        return {
          ...track,
          keyframes: [...preserved, ...duplicated].sort(
            (a, b) => a.frame - b.frame,
          ),
        };
      }),
    );
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

      const keyframes = track.keyframes;

      // Binary search for keyframe at or before target frame - O(log n) instead of O(n log n)
      let beforeIdx = -1;
      let left = 0;
      let right = keyframes.length - 1;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (keyframes[mid].frame <= frame) {
          beforeIdx = mid;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }

      // No keyframe at or before target frame
      if (beforeIdx === -1) {
        return keyframes[0].value;
      }

      const before = keyframes[beforeIdx];

      // No keyframe after target frame (or exact match)
      if (beforeIdx === keyframes.length - 1) {
        return before.value;
      }

      const after = keyframes[beforeIdx + 1];

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
        return before.value;
      }

      // Apply easing to interpolation
      let t = (frame - before.frame) / (after.frame - before.frame);
      if (isNaN(t) || !isFinite(t)) {
        return before.value;
      }

      // Apply easing function if specified on the keyframe
      const easingFn = before.easing ? (EASINGS[before.easing] || linear) : linear;
      t = easingFn(t);

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

        const threshold = PRECISION_THRESHOLDS[prop] ?? 1e-4;
        if (
          currentFrame === 0 ||
          previousValue === null ||
          Math.abs(currentValue - (previousValue as number)) > threshold
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
      const styleDisplay = el.style.display || "";
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

        const threshold = PRECISION_THRESHOLDS.rotation;
        if (
          currentFrame === 0 ||
          previousValue === null ||
          Math.abs(currentValue - (previousValue as number)) > threshold
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
          currentValue ?? "",
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
    const effectiveFps = Math.max(fps, 1);
    startTimeRef.current =
      performance.now() - (startFrame * 1000) / effectiveFps;
    lastFrameRef.current = startFrame;

    const loop = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const exactFrame = (elapsed / 1000) * effectiveFps;
      const frame = Math.max(0, Math.round(exactFrame)); // Use round instead of floor to prevent drift

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
  }, [playing, duration, fps]); // currentFrame removed from deps to avoid recalculation

  // Listen for project load events
  useEffect(() => {
    const handleProjectLoad = (e: Event) => {
      const projectData = (e as CustomEvent).detail;

      // Clear current animation
      setTracks([]);
      setCurrentFrame(0);

      // Load animation data
      if (projectData.animation) {
        setDuration(projectData.animation.duration ?? 300);
        setFps(projectData.animation.fps ?? 30);
        setTracks(projectData.animation.tracks);
      } else {
        setDuration(300);
        setFps(30);
      }
      setPlaying(false); // Stop playback on load
    };

    window.addEventListener("project:load", handleProjectLoad);
    return () => { window.removeEventListener("project:load", handleProjectLoad); };
  }, []);

  const value = useMemo(
    () => ({
      duration,
      fps,
      currentFrame,
      tracks,
      playing,
      recording,
      setPlaying,
      setRecording,
      setDuration,
      setFps,
      setCurrentFrame,
      addKeyframe,
      removeKeyframe,
      moveKeyframes,
      duplicateKeyframes,
      getTrack,
      getValueAtFrame,
      removeAllTracksForTarget,
      snapshotKeyframes,
    }),
    [
      duration,
      fps,
      currentFrame,
      tracks,
      playing,
      recording,
      addKeyframe,
      removeKeyframe,
      moveKeyframes,
      duplicateKeyframes,
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
