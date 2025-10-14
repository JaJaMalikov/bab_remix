import { render, screen, fireEvent } from '@testing-library/react';
import { AssetItem, Asset } from '../../src/components/AssetItem';
import * as UiContext from '../../src/context/UiContext';
import { vi } from 'vitest';

describe('AssetItem', () => {
  const mockUi = {
    importAsset: vi.fn(),
  };

  const asset: Asset = {
    name: 'Test Asset',
    type: 'objet',
    path: '/path/to/asset.svg',
  };

  beforeEach(() => {
    vi.spyOn(UiContext, 'useUi').mockReturnValue(mockUi as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the asset information', () => {
    render(<AssetItem asset={asset} />);
    expect(screen.getByText('Test Asset')).toBeInTheDocument();
    expect(screen.getByText('objet')).toBeInTheDocument();
    expect(screen.getByAltText('Test Asset')).toHaveAttribute('src', '/path/to/asset.svg');
  });

  it('should call importAsset on double-click', () => {
    render(<AssetItem asset={asset} />);
    fireEvent.doubleClick(screen.getByText('Test Asset'));
    expect(mockUi.importAsset).toHaveBeenCalledWith(asset);
  });

  it('should set dataTransfer on drag start', () => {
    const setData = vi.fn();
    const mockEvent = {
      dataTransfer: {
        setData,
        effectAllowed: '' as any,
      },
    };

    render(<AssetItem asset={asset} />);
    fireEvent.dragStart(screen.getByText('Test Asset'), mockEvent as any);

    expect(setData).toHaveBeenCalledWith('application/json', JSON.stringify(asset));
    expect(mockEvent.dataTransfer.effectAllowed).toBe('copy');
  });
});
