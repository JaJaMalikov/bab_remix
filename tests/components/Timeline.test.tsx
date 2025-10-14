import { render, screen } from '@testing-library/react';
import { Timeline } from '../../src/components/Timeline';
import * as UiContext from '../../src/context/UiContext';
import * as AnimationContext from '../../src/context/AnimationContext';
import { vi } from 'vitest';

describe('Timeline', () => {
  const mockUi = {
    timelineHeight: 100,
    setTimelineHeight: vi.fn(),
    sceneItems: [],
  };

  const mockAnimation = {
    duration: 100,
    currentFrame: 0,
    setCurrentFrame: vi.fn(),
    tracks: [],
    removeKeyframe: vi.fn(),
    playing: false,
    setPlaying: vi.fn(),
    snapshotKeyframes: vi.fn(),
    addKeyframe: vi.fn(),
    getValueAtFrame: vi.fn(),
  };

  beforeEach(() => {
    vi.spyOn(UiContext, 'useUi').mockReturnValue(mockUi as any);
    vi.spyOn(AnimationContext, 'useAnimation').mockReturnValue(mockAnimation as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the timeline without crashing', () => {
    render(<Timeline />);
    expect(screen.getByText('Pistes')).toBeInTheDocument();
    expect(screen.getByText('Élément')).toBeInTheDocument();
  });
});
