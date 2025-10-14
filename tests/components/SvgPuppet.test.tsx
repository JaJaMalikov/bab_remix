import { render, waitFor } from '@testing-library/react';
import { SvgPuppetInlineSimple } from '../../src/components/SvgPuppet';
import { vi } from 'vitest';

const mockSvgText = `
<svg>
  <g id="root-member" data-membre="true">
    <g id="child-member" data-membre="true"></g>
  </g>
</svg>
`;

const mockMetadata = {
  id: 'test-puppet',
  source: 'test.svg',
  rootMemberId: 'root-member',
  members: [
    { id: 'root-member', name: 'root', parentId: null, children: ['child-member'], isBehindParent: false },
    { id: 'child-member', name: 'child', parentId: 'root-member', children: [], isBehindParent: false },
  ],
  variantGroups: [],
};

// Mock fetch
global.fetch = vi.fn((url: string) => {
  if (url.endsWith('.svg')) {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(mockSvgText),
    });
  }
  if (url.endsWith('.json')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockMetadata),
    });
  }
  return Promise.reject(new Error(`Unknown URL: ${url}`));
}) as any;

describe('SvgPuppetInlineSimple', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch, process, and render the puppet', async () => {
    const onReady = vi.fn();
    render(<SvgPuppetInlineSimple src="test.svg" onReady={onReady} />);

    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
      const [rootGroup, metadata] = onReady.mock.calls[0];
      expect(rootGroup).toBeInstanceOf(SVGGElement);
      expect(rootGroup.id).toBe('root-member');
      expect(metadata).toEqual(mockMetadata);
    });
  });

  it('should use the cache on second render', async () => {
    const onReady1 = vi.fn();
    const onReady2 = vi.fn();

    // First render
    const { rerender } = render(<SvgPuppetInlineSimple src="test.svg" onReady={onReady1} />);
    await waitFor(() => expect(onReady1).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledTimes(2); // 1 for svg, 1 for json

    // Second render with the same src
    rerender(<SvgPuppetInlineSimple src="test.svg" onReady={onReady2} />);
    await waitFor(() => expect(onReady2).toHaveBeenCalled());

    // Fetch should not be called again
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
