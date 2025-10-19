import "@testing-library/jest-dom";
import { vi } from 'vitest';

// Mock SVGElement.getBBox
if (typeof SVGElement.prototype.getBBox === 'undefined') {
  SVGElement.prototype.getBBox = () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    toJSON: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  });
}

// Mock ResizeObserver
const MockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

vi.stubGlobal('ResizeObserver', MockResizeObserver);