import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { AnimationProvider, useAnimation } from "../../src/context/AnimationContext";
import type { ReactNode } from "react";
import { act } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AnimationProvider>{children}</AnimationProvider>
);

describe("Animation Interpolation - Integration Tests", () => {
  describe("Linear Interpolation", () => {
    it("should interpolate between two keyframes", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "x", 0, 0);
        result.current.addKeyframe("item-1", null, "x", 100, 100);
      });

      expect(result.current.getValueAtFrame("item-1", null, "x", 0)).toBe(0);
      expect(result.current.getValueAtFrame("item-1", null, "x", 25)).toBe(25);
      expect(result.current.getValueAtFrame("item-1", null, "x", 50)).toBe(50);
      expect(result.current.getValueAtFrame("item-1", null, "x", 75)).toBe(75);
      expect(result.current.getValueAtFrame("item-1", null, "x", 100)).toBe(100);
    });

    it("should handle non-uniform keyframe spacing", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "rotation", 0, 0);
        result.current.addKeyframe("item-1", null, "rotation", 30, 90);
        result.current.addKeyframe("item-1", null, "rotation", 100, 180);
      });

      expect(result.current.getValueAtFrame("item-1", null, "rotation", 15)).toBe(45);
      expect(result.current.getValueAtFrame("item-1", null, "rotation", 65)).toBe(135);
    });

    it("should interpolate negative values", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "x", 0, -100);
        result.current.addKeyframe("item-1", null, "x", 100, 100);
      });

      expect(result.current.getValueAtFrame("item-1", null, "x", 0)).toBe(-100);
      expect(result.current.getValueAtFrame("item-1", null, "x", 50)).toBe(0);
      expect(result.current.getValueAtFrame("item-1", null, "x", 100)).toBe(100);
    });
  });

  describe("Edge Cases", () => {
    it("should return exact keyframe value when frame matches", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "x", 50, 123.456);
      });

      expect(result.current.getValueAtFrame("item-1", null, "x", 50)).toBe(123.456);
    });

    it("should return first keyframe value for frames before all keyframes", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "x", 50, 100);
        result.current.addKeyframe("item-1", null, "x", 100, 200);
      });

      expect(result.current.getValueAtFrame("item-1", null, "x", 0)).toBe(100);
      expect(result.current.getValueAtFrame("item-1", null, "x", 25)).toBe(100);
    });

    it("should return last keyframe value for frames after all keyframes", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "x", 0, 100);
        result.current.addKeyframe("item-1", null, "x", 50, 200);
      });

      expect(result.current.getValueAtFrame("item-1", null, "x", 100)).toBe(200);
      expect(result.current.getValueAtFrame("item-1", null, "x", 500)).toBe(200);
    });

    it("should handle single keyframe", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "x", 50, 100);
      });

      expect(result.current.getValueAtFrame("item-1", null, "x", 0)).toBe(100);
      expect(result.current.getValueAtFrame("item-1", null, "x", 50)).toBe(100);
      expect(result.current.getValueAtFrame("item-1", null, "x", 100)).toBe(100);
    });

    it("should return null for non-existent track", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });
      expect(result.current.getValueAtFrame("nonexistent", null, "x", 50)).toBeNull();
    });
  });

  describe("Step Interpolation (Non-Numeric)", () => {
    it("should use step interpolation for visibility", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "visible", 0, true);
        result.current.addKeyframe("item-1", null, "visible", 100, false);
      });

      expect(result.current.getValueAtFrame("item-1", null, "visible", 0)).toBe(true);
      expect(result.current.getValueAtFrame("item-1", null, "visible", 50)).toBe(true);
      expect(result.current.getValueAtFrame("item-1", null, "visible", 99)).toBe(true);
      expect(result.current.getValueAtFrame("item-1", null, "visible", 100)).toBe(false);
    });

    it("should use step interpolation for activeVariant", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", "head", "activeVariant", 0, "variant-a");
        result.current.addKeyframe("item-1", "head", "activeVariant", 50, "variant-b");
      });

      expect(result.current.getValueAtFrame("item-1", "head", "activeVariant", 0)).toBe("variant-a");
      expect(result.current.getValueAtFrame("item-1", "head", "activeVariant", 25)).toBe("variant-a");
      expect(result.current.getValueAtFrame("item-1", "head", "activeVariant", 49)).toBe("variant-a");
      expect(result.current.getValueAtFrame("item-1", "head", "activeVariant", 50)).toBe("variant-b");
    });

    it("should use step interpolation for attachment", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "attachment", 0, "puppet-1:arm");
        result.current.addKeyframe("item-1", null, "attachment", 100, "puppet-2:leg");
      });

      expect(result.current.getValueAtFrame("item-1", null, "attachment", 50)).toBe("puppet-1:arm");
      expect(result.current.getValueAtFrame("item-1", null, "attachment", 99)).toBe("puppet-1:arm");
      expect(result.current.getValueAtFrame("item-1", null, "attachment", 100)).toBe("puppet-2:leg");
    });
  });

  describe("Binary Search Performance", () => {
    it("should handle many keyframes efficiently", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        for (let i = 0; i < 1000; i++) {
          result.current.addKeyframe("item-1", null, "x", i, i * 10);
        }
      });

      const start = performance.now();
      expect(result.current.getValueAtFrame("item-1", null, "x", 0)).toBe(0);
      expect(result.current.getValueAtFrame("item-1", null, "x", 500)).toBe(5000);
      expect(result.current.getValueAtFrame("item-1", null, "x", 999)).toBe(9990);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it("should handle unsorted frame queries", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        [0, 25, 50, 75, 100].forEach(frame => {
          result.current.addKeyframe("item-1", null, "y", frame, frame);
        });
      });

      expect(result.current.getValueAtFrame("item-1", null, "y", 87)).toBe(87);
      expect(result.current.getValueAtFrame("item-1", null, "y", 12)).toBe(12);
      expect(result.current.getValueAtFrame("item-1", null, "y", 63)).toBe(63);
      expect(result.current.getValueAtFrame("item-1", null, "y", 38)).toBe(38);
    });
  });

  describe("Multiple Tracks", () => {
    it("should interpolate multiple properties independently", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "x", 0, 0);
        result.current.addKeyframe("item-1", null, "x", 100, 100);
        result.current.addKeyframe("item-1", null, "y", 0, 100);
        result.current.addKeyframe("item-1", null, "y", 100, 0);
      });

      expect(result.current.getValueAtFrame("item-1", null, "x", 50)).toBe(50);
      expect(result.current.getValueAtFrame("item-1", null, "y", 50)).toBe(50);
    });

    it("should handle different targets independently", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "x", 0, 0);
        result.current.addKeyframe("item-1", null, "x", 100, 100);
        result.current.addKeyframe("item-2", null, "x", 0, 50);
        result.current.addKeyframe("item-2", null, "x", 100, 150);
      });

      expect(result.current.getValueAtFrame("item-1", null, "x", 50)).toBe(50);
      expect(result.current.getValueAtFrame("item-2", null, "x", 50)).toBe(100);
    });

    it("should handle puppet members independently", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("puppet-1", null, "x", 0, 0);
        result.current.addKeyframe("puppet-1", null, "x", 100, 100);
        result.current.addKeyframe("puppet-1", "arm", "rotation", 0, 0);
        result.current.addKeyframe("puppet-1", "arm", "rotation", 100, 90);
      });

      expect(result.current.getValueAtFrame("puppet-1", null, "x", 50)).toBe(50);
      expect(result.current.getValueAtFrame("puppet-1", "arm", "rotation", 50)).toBe(45);
    });
  });

  describe("Easing Support", () => {
    it("should have easing field on keyframes", () => {
      const { result } = renderHook(() => useAnimation(), { wrapper });

      act(() => {
        result.current.addKeyframe("item-1", null, "x", 0, 0);
      });

      const track = result.current.getTrack("item-1", null, "x");
      expect(track?.keyframes[0]).toHaveProperty("frame");
      expect(track?.keyframes[0]).toHaveProperty("value");
      // Easing is optional
      expect(track?.keyframes[0].easing).toBeUndefined();
    });
  });
});
