import { render, screen, fireEvent } from "@testing-library/react";
import { LayerItem } from "../../src/components/LayerItem";
import * as UiContext from "../../src/context/UiContext";
import { vi } from "vitest";

describe("LayerItem", () => {
  const bringForward = vi.fn();
  const sendBackward = vi.fn();
  const setSelectedPuppet = vi.fn();

  beforeEach(() => {
    vi.spyOn(UiContext, "useUi").mockReturnValue({
      bringForward,
      sendBackward,
      setSelectedPuppet,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const item = {
    id: "1",
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

  it('should call setSelectedPuppet when the "Select" button is clicked', () => {
    render(<LayerItem item={item} />);
    fireEvent.click(screen.getByText("Select"));
    expect(setSelectedPuppet).toHaveBeenCalledWith(item.el);
  });
});
