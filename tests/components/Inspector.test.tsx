import { render, screen } from '@testing-library/react';
import { Inspector } from '../../src/components/Inspector';
import * as UiContext from '../../src/context/UiContext';
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

describe('Inspector', () => {
  const mockUi = {
    sceneItems: [
      { id: '1', type: 'puppet', label: 'Puppet 1', el: document.createElementNS('http://www.w3.org/2000/svg', 'g') },
      { id: '2', type: 'image', label: 'Image 1', el: document.createElementNS('http://www.w3.org/2000/svg', 'image') },
    ],
    selectedItemId: '1',
    setSelectedItemId: vi.fn(),
    selectedLimb: null,
    setSelectedLimb: vi.fn(),
    angle: 0,
    setAngle: vi.fn(),
    removeSceneItem: vi.fn(),
    updateSceneItemLabel: vi.fn(),
    setShowInspector: vi.fn(),
  };

  const mockAnimation = {
    currentFrame: 0,
    addKeyframe: vi.fn(),
    getTrack: vi.fn(),
    removeAllTracksForTarget: vi.fn(),
    getValueAtFrame: vi.fn(),
    snapshotKeyframes: vi.fn(),
  };

  beforeEach(() => {
    vi.spyOn(UiContext, 'useUi').mockReturnValue(mockUi as any);
    vi.spyOn(AnimationContext, 'useAnimation').mockReturnValue(mockAnimation as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the inspector with the correct title', () => {
    render(<Inspector />);
    expect(screen.getByTestId('floating-panel')).toBeInTheDocument();
    expect(screen.getByText('Inspector')).toBeInTheDocument();
  });

  it('should display the list of scene items', () => {
    render(<Inspector />);
    expect(screen.getByText(/Puppet 1/)).toBeInTheDocument();
    expect(screen.getByText(/Image 1/)).toBeInTheDocument();
  });

  it('should display properties for the selected item', () => {
    render(<Inspector />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    // The name is not in an input, but a div, so we can't use getByDisplayValue
    expect(screen.getByText('Puppet 1')).toBeInTheDocument();
  });
});
