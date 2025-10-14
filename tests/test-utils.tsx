import React, { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AnimationContext, AnimationContextType } from '../src/context/AnimationContext';
import { UiContext, UiContextType } from '../src/context/UiContext';
import { vi } from 'vitest';

const defaultAnimationContext: AnimationContextType = {
  duration: 100,
  currentFrame: 0,
  playing: false,
  tracks: [],
  setDuration: vi.fn(),
  setCurrentFrame: vi.fn(),
  setPlaying: vi.fn(),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  addKeyframe: vi.fn(),
  removeKeyframe: vi.fn(),
  getTrack: vi.fn(),
  getValueAtFrame: vi.fn(),
  removeAllTracksForTarget: vi.fn(),
  snapshotKeyframes: vi.fn(),
  loadTracks: vi.fn(),
};

const defaultUiContext: UiContextType = {
  sceneItems: [],
  selectedItemId: null,
  selectedLimb: null,
  angle: 0,
  showLibrary: true,
  showInspector: true,
  showLayers: true,
  showTimeline: true,
  timelineHeight: 200,
  addSceneItem: vi.fn(),
  removeSceneItem: vi.fn(),
  updateSceneItemLabel: vi.fn(),
  setSelectedItemId: vi.fn(),
  setSelectedLimb: vi.fn(),
  setAngle: vi.fn(),
  setShowLibrary: vi.fn(),
  setShowInspector: vi.fn(),
  setShowLayers: vi.fn(),
  setShowTimeline: vi.fn(),
  setTimelineHeight: vi.fn(),
  setFitInView: vi.fn(),
  setImportAsset: vi.fn(),
  fitInView: undefined,
  importAsset: undefined,
};

interface CustomRenderOptions extends RenderOptions {
  uiContextProps?: Partial<UiContextType>;
  animationContextProps?: Partial<AnimationContextType>;
}

const customRender = (
  ui: React.ReactElement,
  { uiContextProps, animationContextProps, ...options }: CustomRenderOptions = {},
) => {
  const AllTheProviders = ({ children }: { children: ReactNode }) => {
    const uiValue = { ...defaultUiContext, ...uiContextProps };
    const animValue = { ...defaultAnimationContext, ...animationContextProps };
    return (
      <UiContext.Provider value={uiValue}>
        <AnimationContext.Provider value={animValue}>
          {children}
        </AnimationContext.Provider>
      </UiContext.Provider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

export * from '@testing-library/react';
export { customRender as render };