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

    const collapseButton = screen.getByTitle("Collapse panel");
    fireEvent.click(collapseButton);

    // After collapsing, the trigger and collapsible should report the closed state
    const collapsedTrigger = screen.getByTitle("Expand panel");
    expect(collapsedTrigger).toHaveAttribute("data-state", "closed");

    const collapsedRegion = screen
      .getByText("Panel Content")
      .closest(".panel-collapsible") as HTMLElement;
    expect(collapsedRegion).toHaveAttribute("data-state", "closed");

    fireEvent.click(collapsedTrigger);

    // After expanding, the content should be visible again
    const expandedRegion = screen
      .getByText("Panel Content")
      .closest(".panel-collapsible") as HTMLElement;
    expect(expandedRegion).toHaveAttribute("data-state", "open");
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

    const closeButton = screen.getByTitle("Close panel");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });
});
