import { render, screen, act } from "@testing-library/react";
import { Layers } from "../../src/components/Layers";
import { resetUiState, useUi } from "../../src/context/UiContext";
import { vi } from "vitest";

// Mock child components
vi.mock("../../src/components/FloatingPanel", () => ({
  FloatingPanel: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="floating-panel">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("../../src/components/LayerItem", () => ({
  LayerItem: ({ item }: { item: { id: string; label: string } }) => (
    <div data-testid="layer-item">{item.label}</div>
  ),
}));

describe("Layers", () => {
  beforeEach(() => {
    act(() => {
      resetUiState();
    });
  });

  afterEach(() => {
    act(() => {
      resetUiState();
    });
    vi.restoreAllMocks();
  });

  it("should render the layers panel with items", () => {
    act(() => {
      useUi.setState({
        sceneItems: [
          {
            id: "1",
            type: "puppet",
            label: "Layer 1",
            el: document.createElement("div"),
          },
          {
            id: "2",
            type: "image",
            label: "Layer 2",
            el: document.createElement("div"),
          },
        ],
      });
    });

    render(<Layers />);

    expect(screen.getByText("Layer 1")).toBeInTheDocument();
    expect(screen.getByText("Layer 2")).toBeInTheDocument();
    expect(screen.queryByText("No items in scene")).not.toBeInTheDocument();
  });

  it("should render a message when there are no items", () => {
    act(() => {
      useUi.setState({ sceneItems: [] });
    });

    render(<Layers />);

    expect(screen.getByText("No items in scene")).toBeInTheDocument();
  });
});
