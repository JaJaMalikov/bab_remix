import { render, screen } from '@testing-library/react';
import { Layers } from '../../src/components/Layers';
import * as UiContext from '../../src/context/UiContext';
import { vi } from 'vitest';

// Mock child components
vi.mock('../../src/components/FloatingPanel', () => ({
  FloatingPanel: ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div data-testid="floating-panel">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('../../src/components/LayerItem', () => ({
  LayerItem: ({ item }: { item: { id: string, label: string } }) => (
    <div data-testid="layer-item">{item.label}</div>
  ),
}));

describe('Layers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the layers panel with items', () => {
    const mockUi = {
      sceneItems: [
        { id: '1', label: 'Layer 1' },
        { id: '2', label: 'Layer 2' },
      ],
      setShowLayers: vi.fn(),
    };
    vi.spyOn(UiContext, 'useUi').mockReturnValue(mockUi as any);

    render(<Layers />);

    expect(screen.getByText('Layers')).toBeInTheDocument();
    expect(screen.getByText('Layer 1')).toBeInTheDocument();
    expect(screen.getByText('Layer 2')).toBeInTheDocument();
    expect(screen.queryByText('No items in scene')).not.toBeInTheDocument();
  });

  it('should render a message when there are no items', () => {
    const mockUi = {
      sceneItems: [],
      setShowLayers: vi.fn(),
    };
    vi.spyOn(UiContext, 'useUi').mockReturnValue(mockUi as any);

    render(<Layers />);

    expect(screen.getByText('Layers')).toBeInTheDocument();
    expect(screen.getByText('No items in scene')).toBeInTheDocument();
  });
});
