import { useState, useRef, useEffect } from 'react';
import { useWindowDrag } from './useWindowDrag';
import { getRotationFromTransform, setRotationWithOrigin } from '../utils/svgTransform';
import type { SceneItem } from '../context/UiContext';
import { AnimationProperty } from '../context/AnimationContext';

const parseTransformOrigin = (limb: SVGGElement): { local: { x: number; y: number }; screen: { x: number; y: number } } | null => {
  try {
    const originStr = limb.style.transformOrigin || getComputedStyle(limb).transformOrigin || '';
    if (!originStr) return null;
    const parts = originStr.trim().split(/\s+/);
    if (parts.length < 2) return null;
    const [oxRaw, oyRaw] = parts;
    const bbox = limb.getBBox();
    const parseValue = (value: string, axis: 'x' | 'y') => {
      if (value.endsWith('%')) {
        const percent = parseFloat(value) / 100;
        const base = axis === 'x' ? bbox.x : bbox.y;
        const size = axis === 'x' ? bbox.width : bbox.height;
        return base + size * percent;
      }
      const match = value.match(/(-?\d*\.?\d+)/);
      if (match) {
        return parseFloat(match[1]);
      }
      return axis === 'x' ? bbox.x + bbox.width / 2 : bbox.y + bbox.height / 2;
    };
    const localX = parseValue(oxRaw, 'x');
    const localY = parseValue(oyRaw, 'y');
    const ownerSvg = limb.ownerSVGElement;
    const screenMatrix = limb.getScreenCTM();
    if (!ownerSvg || !screenMatrix) return null;
    const point = ownerSvg.createSVGPoint();
    point.x = localX;
    point.y = localY;
    const screenPoint = point.matrixTransform(screenMatrix);
    return {
      local: { x: localX, y: localY },
      screen: { x: screenPoint.x, y: screenPoint.y },
    };
  } catch {
    return null;
  }
};

interface LimbRotatorArgs {
  svgRef: React.RefObject<SVGSVGElement | null>;
  dragMovedRef: React.MutableRefObject<boolean>;
  sceneItems: SceneItem[];
  setSelectedItemId: (id: string | null) => void;
  setUiSelectedPuppet: (puppet: SVGGElement | null) => void;
  setUiSelectedLimb: (limbId: string) => void;
  setUiAngle: (angle: number) => void;
  addKeyframe: (targetId: string, targetMemberId: string | null, property: AnimationProperty, frame: number, value: any) => void;
  currentFrame: number;
  ensureInitialSnapshot: () => void;
}

export const useLimbRotator = ({
  svgRef,
  dragMovedRef,
  sceneItems,
  setSelectedItemId,
  setUiSelectedPuppet,
  setUiSelectedLimb,
  setUiAngle,
  addKeyframe,
  currentFrame,
  ensureInitialSnapshot,
}: LimbRotatorArgs) => {
  const rotationStateRef = useRef<{
    limb: SVGGElement;
    puppetAnchor: SVGGElement;
    sceneItemId: string | null;
    origin: { x: number; y: number };
    startAngleRad: number;
    baseRotationRad: number;
    lastRotationDeg: number;
    hasMoved: boolean;
  } | null>(null);

  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const sceneItemsByElement = new Map<Element, string>();
    sceneItems.forEach((item) => {
      sceneItemsByElement.set(item.el, item.id);
    });

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!e.ctrlKey && !e.metaKey) return;
      const target = (e.target as Element | null)?.closest('[data-membre]') as SVGGElement | null;
      if (!target) return;

      const anchor = target.closest('[data-anchor="puppet"]') as SVGGElement | null;
      if (!anchor) return;

      const puppetRoot = anchor.firstChild as SVGGElement | null;
      if (!puppetRoot) return;

      const originInfo = parseTransformOrigin(target);
      if (!originInfo) return;

      const pointer = { x: e.clientX, y: e.clientY };
      const startAngleRad = Math.atan2(pointer.y - originInfo.screen.y, pointer.x - originInfo.screen.x);
      if (!Number.isFinite(startAngleRad)) return;

      const baseRotationDeg = getRotationFromTransform(target);
      const baseRotationRad = (baseRotationDeg * Math.PI) / 180;

      const sceneItemId = sceneItemsByElement.get(anchor) ?? null;

      rotationStateRef.current = {
        limb: target,
        puppetAnchor: anchor,
        sceneItemId,
        origin: originInfo.screen,
        startAngleRad,
        baseRotationRad,
        lastRotationDeg: baseRotationDeg,
        hasMoved: false,
      };

      dragMovedRef.current = true;
      setIsRotating(true);

      if (sceneItemId) {
        setSelectedItemId(sceneItemId);
      }
      setUiSelectedPuppet(puppetRoot);
      setUiSelectedLimb(target.id);
      setUiAngle(Math.round(baseRotationDeg));

      e.stopPropagation();
      e.preventDefault();
    };

    const captureOptions: AddEventListenerOptions = { capture: true };
    svg.addEventListener('mousedown', onMouseDown, captureOptions);

    return () => {
      svg.removeEventListener('mousedown', onMouseDown, captureOptions);
    };
  }, [sceneItems, setSelectedItemId, setUiAngle, setUiSelectedLimb, setUiSelectedPuppet, dragMovedRef]);

  useWindowDrag(
    isRotating,
    (e: MouseEvent) => {
      const state = rotationStateRef.current;
      if (!state) return;
      const pointer = { x: e.clientX, y: e.clientY };
      const currentAngleRad = Math.atan2(pointer.y - state.origin.y, pointer.x - state.origin.x);
      if (!Number.isFinite(currentAngleRad)) return;

      const normalizeRadians = (value: number) => {
        const twoPi = Math.PI * 2;
        let result = value % twoPi;
        if (result > Math.PI) result -= twoPi;
        if (result < -Math.PI) result += twoPi;
        return result;
      };

      const delta = normalizeRadians(currentAngleRad - state.startAngleRad);
      const newRotationRad = state.baseRotationRad + delta;
      const newRotationDeg = (newRotationRad * 180) / Math.PI;

      setRotationWithOrigin(state.limb, newRotationDeg);
      setUiAngle(Math.round(newRotationDeg));
      state.lastRotationDeg = newRotationDeg;
      state.hasMoved = true;

      ensureInitialSnapshot();
      if (state.sceneItemId) {
        addKeyframe(state.sceneItemId, state.limb.id, 'rotation', currentFrame, newRotationDeg);
      }

      window.dispatchEvent(new CustomEvent('item:transformed', { detail: { id: state.sceneItemId, final: false } }));
    },
    () => {
      const state = rotationStateRef.current;
      if (!state) return;

      if (state.hasMoved) {
        ensureInitialSnapshot();
        if (state.sceneItemId) {
          addKeyframe(state.sceneItemId, state.limb.id, 'rotation', currentFrame, state.lastRotationDeg);
        }
        window.dispatchEvent(new CustomEvent('item:transformed', { detail: { id: state.sceneItemId, final: true } }));
      }
      rotationStateRef.current = null;
      setIsRotating(false);
    },
  );
};