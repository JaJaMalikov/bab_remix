import React, { useState, useEffect } from "react";
import type { SceneItem } from "../../context/UiContext";
import { readItemTransform } from "../../utils/svgTransform";

interface LiveTransformDisplayProps {
  selectedItem: SceneItem | undefined;
  currentFrame: number;
  transformRefresh: number;
  children: (transform: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  }) => React.ReactNode;
}

/**
 * Optimized component that only re-renders when transform values actually change.
 * This prevents the entire Inspector from re-rendering on every drag movement.
 */
export const LiveTransformDisplay = React.memo(
  function LiveTransformDisplay({
    selectedItem,
    currentFrame,
    transformRefresh,
    children,
  }: LiveTransformDisplayProps) {
    const [transform, setTransform] = useState({
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });

    // Read transform from DOM whenever selectedItem, currentFrame, or drag updates
    useEffect(() => {
      if (!selectedItem) {
        setTransform({
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        });
        return;
      }
      setTransform(readItemTransform(selectedItem.el, selectedItem.type));
    }, [selectedItem, currentFrame, transformRefresh]);

    return <>{children(transform)}</>;
  },
  (prevProps, nextProps) => {
    // Only re-render if selectedItem ID changed, not the object reference
    const prevItemId = prevProps.selectedItem?.id;
    const nextItemId = nextProps.selectedItem?.id;

    return (
      prevItemId === nextItemId &&
      prevProps.currentFrame === nextProps.currentFrame &&
      prevProps.transformRefresh === nextProps.transformRefresh
    );
  }
);
