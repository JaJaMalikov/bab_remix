import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MenuBar } from '../../src/components/MenuBar';
import * as UiContext from '../../src/context/UiContext';
import * as AnimationContext from '../../src/context/AnimationContext';
import * as projectSerializer from '../../src/utils/projectSerializer';
import { vi } from 'vitest';

describe('MenuBar', () => {
  const mockUi = {
    showTimeline: true,
    setShowTimeline: vi.fn(),
    showLibrary: true,
    setShowLibrary: vi.fn(),
    showInspector: true,
    setShowInspector: vi.fn(),
    showLayers: true,
    setShowLayers: vi.fn(),
    fitInView: vi.fn(),
    sceneItems: [],
  };

  const mockAnimation = {
    tracks: [],
    duration: 100,
  };

  const mockSerialize = vi.spyOn(projectSerializer, 'serializeProject').mockReturnValue({} as any);
  const mockSave = vi.spyOn(projectSerializer, 'saveProjectToFile').mockImplementation(vi.fn());
  const mockLoad = vi.spyOn(projectSerializer, 'loadProjectFromFile');

  beforeEach(() => {
    vi.spyOn(UiContext, 'useUi').mockReturnValue(mockUi as any);
    vi.spyOn(AnimationContext, 'useAnimation').mockReturnValue(mockAnimation as any);
    mockLoad.mockResolvedValue({ scene: { items: [] }, tracks: [], duration: 0 });
    window.confirm = vi.fn(() => true);
    window.URL.createObjectURL = vi.fn(() => 'mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the menu bar', () => {
    render(<MenuBar />);
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('should open and close the file menu', () => {
    render(<MenuBar />);
    const fileMenuButton = screen.getByText('File');
    fireEvent.click(fileMenuButton);
    expect(screen.getByText('Save Project')).toBeInTheDocument();
    fireEvent.click(fileMenuButton);
    expect(screen.queryByText('Save Project')).not.toBeInTheDocument();
  });

  it('should call save function on save button click', () => {
    render(<MenuBar />);
    fireEvent.click(screen.getByText('File'));
    fireEvent.click(screen.getByText('Save Project'));
    expect(mockSerialize).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
  });

  it('should call load function on load button click', async () => {
    render(<MenuBar />);
    fireEvent.click(screen.getByText('File'));
    await fireEvent.click(screen.getByText('Open Project'));
    expect(mockLoad).toHaveBeenCalled();
  });

  it('should toggle view panels', async () => {
    render(<MenuBar />);
    fireEvent.click(screen.getByText('View'));

    await screen.findByText('Library');

    fireEvent.click(screen.getByText('Library'));
    expect(mockUi.setShowLibrary).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByText('View'));
    await screen.findByText('Inspector');

    fireEvent.click(screen.getByText('Inspector'));
    expect(mockUi.setShowInspector).toHaveBeenCalledWith(false);
  });
});