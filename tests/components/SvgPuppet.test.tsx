import { render, waitFor } from '@testing-library/react';
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

describe('SvgPuppetInlineSimple', () => {
  beforeEach(() => {
    // Reset modules to clear the cache in SvgPuppet.tsx
    vi.resetModules();

    // Mock fetch for each test
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch, process, and render the puppet', async () => {
    const { SvgPuppetInlineSimple } = await import('../../src/components/SvgPuppet');
    const onReady = vi.fn();
    render(<SvgPuppetInlineSimple src="test.svg" onReady={onReady} />);

    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
      const [rootGroup, metadata] = onReady.mock.calls[0];
      expect(rootGroup.tagName.toLowerCase()).toBe('g');
      expect(rootGroup.id).toBe('root-member');
      expect(metadata).toEqual(mockMetadata);
    });
  });

  it('should use the cache on second render', async () => {
    const { SvgPuppetInlineSimple } = await import('../../src/components/SvgPuppet');
    const onReady1 = vi.fn();
    const onReady2 = vi.fn();

    // First render
    const { rerender } = render(<SvgPuppetInlineSimple src="test.svg" onReady={onReady1} />);
    await waitFor(() => expect(onReady1).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledTimes(2); // 1 for svg, 1 for json

    // Second render with the same src
    rerender(<SvgPuppetInlineSimple src="test.svg" onReady={onReady2} />);

    // Wait a bit to make sure onReady2 is not called
    await new Promise(r => setTimeout(r, 100));

    // onReady2 should not be called because the component does not re-call onReady for same src
    expect(onReady2).not.toHaveBeenCalled();

    // Fetch should not be called again because of the cache
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
