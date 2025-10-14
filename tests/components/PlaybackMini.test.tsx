import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybackMini } from '../../src/components/PlaybackMini';
import * as AnimationContext from '../../src/context/AnimationContext';
import { vi } from 'vitest';

// Mock FloatingPanel to simplify the test
vi.mock('../../src/components/FloatingPanel', () => ({
  FloatingPanel: ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div data-testid="floating-panel">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

describe('PlaybackMini', () => {
  const mockAnimation = {
    playing: false,
    setPlaying: vi.fn(),
    currentFrame: 42,
    setCurrentFrame: vi.fn(),
  };

  beforeEach(() => {
    vi.spyOn(AnimationContext, 'useAnimation').mockReturnValue(mockAnimation as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the playback controls', () => {
    render(<PlaybackMini />);
    expect(screen.getByText('Playback')).toBeInTheDocument();
    expect(screen.getByText('▶ Play')).toBeInTheDocument();
    expect(screen.getByText('⏹ Stop')).toBeInTheDocument();
    expect(screen.getByText('Frame: 42')).toBeInTheDocument();
  });

  it('should call setPlaying when play/pause button is clicked', () => {
    render(<PlaybackMini />);
    fireEvent.click(screen.getByText('▶ Play'));
    expect(mockAnimation.setPlaying).toHaveBeenCalled();
  });

  it('should call setPlaying and setCurrentFrame when stop button is clicked', () => {
    render(<PlaybackMini />);
    fireEvent.click(screen.getByText('⏹ Stop'));
    expect(mockAnimation.setPlaying).toHaveBeenCalledWith(false);
    expect(mockAnimation.setCurrentFrame).toHaveBeenCalledWith(0);
  });
});
