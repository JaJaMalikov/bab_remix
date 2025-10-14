import { render, screen, fireEvent } from "@testing-library/react";
import { FloatingPanel } from "../../src/components/FloatingPanel";
import * as useDraggable from "../../src/hooks/useDraggable";
import * as useResizable from "../../src/hooks/useResizable";
import { vi } from "vitest";

describe("FloatingPanel", () => {
  const mockUseDraggable = {
    position: { x: 10, y: 20 },
    handleMouseDown: vi.fn(),
    isDragging: false,
  };

  const mockUseResizable = {
    size: { width: 300, height: 400 },
    onResizeMouseDown: vi.fn(),
    isResizing: false,
  };

  beforeEach(() => {
    vi.spyOn(useDraggable, "useDraggable").mockReturnValue(
      mockUseDraggable as any,
    );
    vi.spyOn(useResizable, "useResizable").mockReturnValue(
      mockUseResizable as any,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render the panel with title and children", () => {
    render(
      <FloatingPanel title="Test Panel" initialPosition={{ x: 0, y: 0 }}>
        <div>Panel Content</div>
      </FloatingPanel>,
    );

    expect(screen.getByText("Test Panel")).toBeInTheDocument();
    expect(screen.getByText("Panel Content")).toBeInTheDocument();
  });

  it("should toggle minimize state on click", () => {
    render(
      <FloatingPanel title="Test Panel" initialPosition={{ x: 0, y: 0 }}>
        <div>Panel Content</div>
      </FloatingPanel>,
    );

    const minimizeButton = screen.getByTitle("Minimize");
    fireEvent.click(minimizeButton);

    // After minimizing, the content should not be visible
    expect(screen.queryByText("Panel Content")).not.toBeInTheDocument();

    const maximizeButton = screen.getByTitle("Maximize");
    fireEvent.click(maximizeButton);

    // After maximizing, the content should be visible again
    expect(screen.getByText("Panel Content")).toBeInTheDocument();
  });

  it("should call onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <FloatingPanel
        title="Test Panel"
        initialPosition={{ x: 0, y: 0 }}
        onClose={onClose}
      >
        <div>Panel Content</div>
      </FloatingPanel>,
    );

    const closeButton = screen.getByTitle("Close");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });
});
