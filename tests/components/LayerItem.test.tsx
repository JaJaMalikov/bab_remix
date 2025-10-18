import { render, screen, fireEvent, act } from "@testing-library/react";
import { LayerItem } from "../../src/components/LayerItem";
import { resetUiState, useUi } from "../../src/context/UiContext";
import { vi } from "vitest";

describe("LayerItem", () => {
  const bringForward = vi.fn();
  const sendBackward = vi.fn();
  const setSelectedItemId = vi.fn();
  const setShowInspector = vi.fn();
  const setShowLayers = vi.fn();
  const setShowLibrary = vi.fn();

  beforeEach(() => {
    act(() => {
      resetUiState();
      useUi.setState({
        bringForward,
        sendBackward,
        setSelectedItemId,
        setShowInspector,
        setShowLayers,
        setShowLibrary,
      });
    });
  });

  afterEach(() => {
    act(() => {
      resetUiState();
    });
    bringForward.mockReset();
    sendBackward.mockReset();
    setSelectedItemId.mockReset();
    setShowInspector.mockReset();
    setShowLayers.mockReset();
    setShowLibrary.mockReset();
  });

  const item = {
    id: "1",
    type: "puppet" as const,
    label: "Test Layer",
    el: document.createElementNS("http://www.w3.org/2000/svg", "g"),
  };

  it("should render the layer item with the correct label", () => {
    render(<LayerItem item={item} />);
    expect(screen.getByText("Test Layer")).toBeInTheDocument();
  });

  it('should call sendBackward when the "Send backward" button is clicked', () => {
    render(<LayerItem item={item} />);
    fireEvent.click(screen.getByTitle("Send backward"));
    expect(sendBackward).toHaveBeenCalledWith("1");
  });

  it('should call bringForward when the "Bring forward" button is clicked', () => {
    render(<LayerItem item={item} />);
    fireEvent.click(screen.getByTitle("Bring forward"));
    expect(bringForward).toHaveBeenCalledWith("1");
  });

  it('should update inspector state when the "Select" button is clicked', () => {
    render(<LayerItem item={item} />);
    fireEvent.click(screen.getByText("Select"));
    expect(setSelectedItemId).toHaveBeenCalledWith(item.id);
    expect(setShowInspector).toHaveBeenCalledWith(true);
    expect(setShowLayers).toHaveBeenCalledWith(false);
    expect(setShowLibrary).toHaveBeenCalledWith(false);
  });
});
