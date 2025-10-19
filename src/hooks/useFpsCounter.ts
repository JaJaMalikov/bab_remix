import { useEffect, useRef, useState } from "react";

/**
 * Hook to measure and monitor animation playback FPS (Frames Per Second).
 * Useful for debugging performance issues and ensuring smooth playback.
 *
 * @param enabled - Whether FPS counting is active
 * @returns Current FPS value (rounded to nearest integer)
 */
export const useFpsCounter = (enabled: boolean): number => {
  const [fps, setFps] = useState(0);
  const frameTimesRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setFps(0);
      frameTimesRef.current = [];
      return;
    }

    const measureFps = (now: number) => {
      // Track frame times
      frameTimesRef.current.push(now);

      // Keep only last second of frame times
      const oneSecondAgo = now - 1000;
      frameTimesRef.current = frameTimesRef.current.filter(
        (time) => time > oneSecondAgo
      );

      // Update FPS display every 250ms to reduce UI churn
      if (now - lastUpdateRef.current >= 250) {
        const currentFps = frameTimesRef.current.length;
        setFps(currentFps);
        lastUpdateRef.current = now;
      }

      rafRef.current = requestAnimationFrame(measureFps);
    };

    rafRef.current = requestAnimationFrame(measureFps);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  return fps;
};
