import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { SceneItem } from "./UiContext";

export type AnimationProperty =
  | 'rotation'
  | 'x'
  | 'y'
  | 'scaleX'
  | 'scaleY'
  | 'activeVariant'
  | 'attachment'
  | 'visible';

type KeyframeValue = number | string | boolean;

export interface AttachedObject {
  type: 'image' | 'text' | 'audio';
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
  targetId: string;           // id of puppet/image
  targetMemberId: string | null;  // id of member, or null for whole item
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
    attachedObject?: AttachedObject
  ) => void;
  removeKeyframe: (trackId: string, frame: number) => void;
  getTrack: (targetId: string, targetMemberId: string | null, property: AnimationProperty) => AnimationTrack | undefined;
  getValueAtFrame: (targetId: string, targetMemberId: string | null, property: AnimationProperty, frame: number) => KeyframeValue | null;
  removeAllTracksForTarget: (targetId: string) => void;
  snapshotKeyframes: (items: SceneItem[]) => void;
}

const Ctx = createContext<AnimationState | null>(null);

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [duration, setDuration] = useState(300); // 300 frames = 10s at 30fps
  const [currentFrame, setCurrentFrame] = useState(0);
  const [tracks, setTracks] = useState<AnimationTrack[]>([]);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(-1);

  const addKeyframe = useCallback(
    (
      targetId: string,
      targetMemberId: string | null,
      property: AnimationProperty,
      frame: number,
      value: KeyframeValue,
      variant?: string,
      attachedObject?: AttachedObject
    ) => {
      setTracks((prev) => {
        // Find or create track
        const trackKey = `${targetId}:${targetMemberId || 'null'}:${property}`;
        let track = prev.find(
          (t) => t.targetId === targetId && t.targetMemberId === targetMemberId && t.property === property
        );

        if (!track) {
          track = {
            id: trackKey,
            targetId,
            targetMemberId,
            property,
            keyframes: [],
          };
          prev = [...prev, track];
        }

        const newKeyframe = { frame, value, variant, attachedObject };

        // Add or update keyframe
        const existingIndex = track.keyframes.findIndex((kf) => kf.frame === frame);
        if (existingIndex >= 0) {
          track.keyframes[existingIndex] = { ...track.keyframes[existingIndex], ...newKeyframe };
        } else {
          track.keyframes.push(newKeyframe);
          track.keyframes.sort((a, b) => a.frame - b.frame);
        }

        return [...prev];
      });
    },
    []
  );

  const removeKeyframe = useCallback((trackId: string, frame: number) => {
    setTracks((prev) => {
      const track = prev.find((t) => t.id === trackId);
      if (!track) return prev;
      track.keyframes = track.keyframes.filter((kf) => kf.frame !== frame);
      // Remove track if no keyframes left
      if (track.keyframes.length === 0) {
        return prev.filter((t) => t.id !== trackId);
      }
      return [...prev];
    });
  }, []);

  const getTrack = useCallback(
    (targetId: string, targetMemberId: string | null, property: AnimationProperty) => {
      return tracks.find(
        (t) => t.targetId === targetId && t.targetMemberId === targetMemberId && t.property === property
      );
    },
    [tracks]
  );

  const getValueAtFrame = useCallback(
    (targetId: string, targetMemberId: string | null, property: AnimationProperty, frame: number): KeyframeValue | null => {
      const track = getTrack(targetId, targetMemberId, property);
      if (!track || track.keyframes.length === 0) return null;

      // Find surrounding keyframes
      const before = track.keyframes.filter((kf) => kf.frame <= frame).sort((a, b) => b.frame - a.frame)[0];
      const after = track.keyframes.filter((kf) => kf.frame > frame).sort((a, b) => a.frame - b.frame)[0];

      if (!before) return after.value;
      if (!after) return before.value;

      // For variants and attachments, use step interpolation
      if (property === 'activeVariant' || property === 'attachment' || property === 'visible') {
        return before.value;
      }

      // Type guard for interpolation
      if (typeof before.value !== 'number' || typeof after.value !== 'number') {
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
    [getTrack]
  );

  const removeAllTracksForTarget = useCallback((targetId: string) => {
    setTracks((prev) => prev.filter((t) => t.targetId !== targetId));
  }, []);

  const snapshotKeyframes = useCallback(
    (items: SceneItem[]) => {
      items.forEach(item => {
        const el = item.el;
        const targetId = item.id;

        // 1. Snapshot main item transform
        let currentTransform: { x: number; y: number; rotation: number; scaleX: number; scaleY: number };
        if (item.type === "puppet") {
          const transformAttr = el.getAttribute("transform") || "";
          const match = transformAttr.match(/translate\(([-\d.]+)[,\s]+([-\d.]+)\)/);
          currentTransform = match
            ? { x: parseFloat(match[1] || "0"), y: parseFloat(match[2] || "0"), rotation: 0, scaleX: 1, scaleY: 1 }
            : { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
        } else { // image
          const x = parseFloat(el.getAttribute("x") || "0");
          const y = parseFloat(el.getAttribute("y") || "0");
          const transformAttr = el.getAttribute("transform") || "";
          const rotMatch = transformAttr.match(/rotate\(([-\d.]+)/);
          const scaleMatch = transformAttr.match(/scale\(([-\d.]+)(?:[,\s]+([-\d.]+))?\)/);
          const rotation = rotMatch ? parseFloat(rotMatch[1] || "0") : 0;
          const scaleX = scaleMatch ? parseFloat(scaleMatch[1] || "1") : 1;
          const scaleY = scaleMatch && scaleMatch[2] ? parseFloat(scaleMatch[2]) : scaleX;
          currentTransform = { x, y, rotation, scaleX, scaleY };
        }

        const properties = ['x', 'y', 'rotation', 'scaleX', 'scaleY'] as const;
        properties.forEach(prop => {
          if (item.type === 'puppet' && prop !== 'x' && prop !== 'y') return;

          const currentValue = currentTransform[prop];
          const previousValue = getValueAtFrame(targetId, null, prop, currentFrame - 1);

          if (currentFrame === 0 || previousValue === null || Math.abs((currentValue as number) - (previousValue as number)) > 1e-4) {
            addKeyframe(targetId, null, prop, currentFrame, currentValue);
          }
        });

        const displayAttr = el.getAttribute('display');
        const styleDisplay =
          (el as SVGGraphicsElement).style && (el as SVGGraphicsElement).style.display
            ? (el as SVGGraphicsElement).style.display
            : '';
        const isVisible = displayAttr !== 'none' && styleDisplay !== 'none';
        const prevVisible = getValueAtFrame(targetId, null, 'visible', currentFrame - 1);
        if (currentFrame === 0 || prevVisible === null || Boolean(prevVisible) !== isVisible) {
          addKeyframe(targetId, null, 'visible', currentFrame, isVisible);
        }

        // 2. Snapshot puppet members rotation
        if (item.type === "puppet") {
          const puppetRoot = item.el.firstChild as SVGGElement | null;
          if (!puppetRoot) return;

          const members = puppetRoot.querySelectorAll("[data-membre]") as NodeListOf<SVGGElement>;
          members.forEach(memberEl => {
            const memberId = memberEl.id;
            const transformStyle = memberEl.style.transform || "";
            const match = transformStyle.match(/rotate\(([-\d.]+)deg\)/);
            const currentValue = match ? parseFloat(match[1] || "0") : 0;
            const previousValue = getValueAtFrame(targetId, memberId, 'rotation', currentFrame - 1);

            if (currentFrame === 0 || previousValue === null || Math.abs(currentValue - (previousValue as number)) > 1e-4) {
              addKeyframe(targetId, memberId, 'rotation', currentFrame, currentValue);
            }
          });

          // 3. Snapshot puppet variants
          item.metadata?.variantGroups.forEach(group => {
            let activeVariantName: string | null = null;

            // Find the target member containing the variants
            const targetMemberId = group.variants[0]?.targetMemberId;
            if (!targetMemberId) return;

            const targetMember = puppetRoot.querySelector(`#${CSS.escape(targetMemberId)}`) as SVGGElement | null;
            if (!targetMember) return;

            // Find active variant by checking visibility
            for (const variant of group.variants) {
              if (!variant.name) continue;

              // Find variant element by data-variant-name attribute
              const variantEl = Array.from(targetMember.children).find(child => {
                return child.getAttribute('data-variant-groupe') === group.group &&
                       child.getAttribute('data-variant-name') === variant.name;
              }) as SVGElement | null;

              if (variantEl && variantEl.style.display !== 'none' && variantEl.getAttribute('display') !== 'none') {
                activeVariantName = variant.name;
                break;
              }
            }

            if (activeVariantName) {
              const previousValue = getValueAtFrame(targetId, group.group, 'activeVariant', currentFrame - 1);
              if (currentFrame === 0 || previousValue !== activeVariantName) {
                addKeyframe(targetId, group.group, 'activeVariant', currentFrame, activeVariantName);
              }
            }
          });
        }

        // 4. Snapshot attachments for images
        if (item.type === 'image') {
          const imageEl = item.el as SVGImageElement;
          const attachedPuppetId = imageEl.getAttribute('data-attached-to-puppet');
          const attachedMemberId = imageEl.getAttribute('data-attached-to-member');

          const currentValue = attachedPuppetId ? `${attachedPuppetId}:${attachedMemberId}` : null;
          const previousValue = getValueAtFrame(targetId, null, 'attachment', currentFrame - 1);

          if (currentFrame === 0 || previousValue !== currentValue) {
            addKeyframe(targetId, null, 'attachment', currentFrame, currentValue || '');
          }
        }
      });
    },
    [addKeyframe, currentFrame, getValueAtFrame]
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
      const frame = Math.floor((elapsed / 1000) * 30); // 30 fps

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
    [duration, currentFrame, tracks, playing, addKeyframe, removeKeyframe, getTrack, getValueAtFrame, removeAllTracksForTarget, snapshotKeyframes]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAnimation = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAnimation must be used within AnimationProvider");
  return ctx;
};
