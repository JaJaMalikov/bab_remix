import { render, screen } from '@testing-library/react';
import { SvgScene } from '../../src/components/SvgScene';
import * as UiContext from '../../src/context/UiContext';
import * as AnimationContext from '../../src/context/AnimationContext';
import { vi } from 'vitest';

describe('SvgScene', () => {
  beforeEach(() => {
    vi.spyOn(UiContext, 'useUi').mockReturnValue({
      selectedPuppet: null,
      selectedLimb: null,
      angle: 0,
      setSelectedPuppet: vi.fn(),
      setSelectedLimb: vi.fn(),
      setAngle: vi.fn(),
      setSelectedItemId: vi.fn(),
      sceneItems: [],
      addSceneItem: vi.fn(),
      setFitInView: vi.fn(),
      setImportAsset: vi.fn(),
    } as any);

    vi.spyOn(AnimationContext, 'useAnimation').mockReturnValue({
      currentFrame: 0,
      addKeyframe: vi.fn(),
      snapshotKeyframes: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render without crashing', () => {
    render(<SvgScene />);
    expect(screen.getByTestId('scene-canvas')).toBeInTheDocument();
  });
});
