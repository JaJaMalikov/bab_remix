import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { ItemProperties } from "../../src/components/inspector/ItemProperties";
import { resetUiState, useUi } from "../../src/context/UiContext";
import type { SceneItem, UiState } from "../../src/context/UiContext";
import "@testing-library/jest-dom";

const createItem = (overrides: Partial<SceneItem> = {}): SceneItem => ({
  id: "item-1",
  type: "puppet",
  label: "Original Label",
  el: document.createElement("div"),
  ...overrides,
});

describe("ItemProperties", () => {
  beforeEach(() => {
    act(() => resetUiState());
  });

  afterEach(() => {
    act(() => resetUiState());
  });

  it("switches to edit mode and saves the new label on Enter", () => {
    const updateSceneItemLabel = vi.fn();
    act(() => {
      useUi.setState({ updateSceneItemLabel } as Partial<UiState>);
    });

    render(<ItemProperties item={createItem()} />);

    fireEvent.click(screen.getByRole("button", { name: /Original Label/i }));
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "Updated Label" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(updateSceneItemLabel).toHaveBeenCalledWith("item-1", "Updated Label");
    expect(screen.getByRole("button", { name: /Original Label/i })).toBeInTheDocument();
  });

  it("saves the label when clicking the confirm button", () => {
    const updateSceneItemLabel = vi.fn();
    act(() => {
      useUi.setState({ updateSceneItemLabel } as Partial<UiState>);
    });

    render(<ItemProperties item={createItem()} />);

    fireEvent.click(screen.getByRole("button", { name: /Original Label/i }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Confirmed" } });

    fireEvent.click(screen.getByRole("button", { name: "✓" }));

    expect(updateSceneItemLabel).toHaveBeenCalledWith("item-1", "Confirmed");
  });

  it("resets edit state when displaying a different item", () => {
    const updateSceneItemLabel = vi.fn();
    act(() => {
      useUi.setState({ updateSceneItemLabel } as Partial<UiState>);
    });

    const { rerender } = render(<ItemProperties item={createItem()} />);

    fireEvent.click(screen.getByRole("button", { name: /Original Label/i }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    rerender(
      <ItemProperties
        item={createItem({ id: "item-2", label: "Second Item" })}
      />,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Second Item/i })).toBeInTheDocument();
  });
});
