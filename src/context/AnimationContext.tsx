import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from "react";

export type AnimationProperty = 'rotation' | 'x' | 'y' | 'scaleX' | 'scaleY';

export interface Keyframe {
  frame: number;
  value: number;
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
  setPlaying: (playing: boolean) => void;

  setDuration: (frames: number) => void;
  setCurrentFrame: (frame: number) => void;

  addKeyframe: (targetId: string, targetMemberId: string | null, property: AnimationProperty, frame: number, value: number) => void;
  removeKeyframe: (trackId: string, frame: number) => void;
  getTrack: (targetId: string, targetMemberId: string | null, property: AnimationProperty) => AnimationTrack | undefined;
  getValueAtFrame: (targetId: string, targetMemberId: string | null, property: AnimationProperty, frame: number) => number | null;
  removeAllTracksForTarget: (targetId: string) => void;
}

const Ctx = createContext<AnimationState | null>(null);

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [duration, setDuration] = useState(300); // 300 frames = 10s at 30fps
  const [currentFrame, setCurrentFrame] = useState(0);
  const [tracks, setTracks] = useState<AnimationTrack[]>([]);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const addKeyframe = useCallback(
    (targetId: string, targetMemberId: string | null, property: AnimationProperty, frame: number, value: number) => {
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

        // Add or update keyframe
        const existingIndex = track.keyframes.findIndex((kf) => kf.frame === frame);
        if (existingIndex >= 0) {
          track.keyframes[existingIndex] = { frame, value };
        } else {
          track.keyframes.push({ frame, value });
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
    (targetId: string, targetMemberId: string | null, property: AnimationProperty, frame: number): number | null => {
      const track = getTrack(targetId, targetMemberId, property);
      if (!track || track.keyframes.length === 0) return null;

      // Find surrounding keyframes
      const before = track.keyframes.filter((kf) => kf.frame <= frame).sort((a, b) => b.frame - a.frame)[0];
      const after = track.keyframes.filter((kf) => kf.frame > frame).sort((a, b) => a.frame - b.frame)[0];

      if (!before) return after.value; // Before first keyframe
      if (!after) return before.value; // After last keyframe

      // Linear interpolation
      const t = (frame - before.frame) / (after.frame - before.frame);
      return before.value + t * (after.value - before.value);
    },
    [getTrack]
  );

  const removeAllTracksForTarget = useCallback((targetId: string) => {
    setTracks((prev) => prev.filter((t) => t.targetId !== targetId));
  }, []);

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

    const loop = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const frame = Math.floor((elapsed / 1000) * 30); // 30 fps

      if (frame >= duration) {
        setCurrentFrame(0);
        setPlaying(false);
        return;
      }

      setCurrentFrame(frame);
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
    }),
    [duration, currentFrame, tracks, playing, addKeyframe, removeKeyframe, getTrack, getValueAtFrame, removeAllTracksForTarget]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAnimation = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAnimation must be used within AnimationProvider");
  return ctx;
};
