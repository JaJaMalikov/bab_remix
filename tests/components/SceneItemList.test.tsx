import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SceneItemList } from "../../src/components/inspector/SceneItemList";
import type { SceneItem } from "../../src/context/UiContext";
import "@testing-library/jest-dom";

const createSceneItem = (overrides: Partial<SceneItem> = {}): SceneItem => ({
  id: "item-1",
  type: "puppet",
  label: "Puppet 1",
  el: document.createElement("div"),
  ...overrides,
});

describe("SceneItemList", () => {
  it("renders items count, labels and icons", () => {
    const items = [
      createSceneItem(),
      createSceneItem({ id: "item-2", type: "image", label: "Image 1" }),
    ];
    const onSelectItem = vi.fn();

    render(
      <SceneItemList
        items={items}
        selectedId={null}
        onSelectItem={onSelectItem}
        onDeselectAll={vi.fn()}
        onDeleteItem={vi.fn()}
      />,
    );

    expect(screen.getByText("ITEMS (2)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Puppet 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Image 1/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Image 1/i }));
    expect(onSelectItem).toHaveBeenCalledWith("item-2");
  });

  it("shows deselect button when an item is selected", () => {
    const onDeselectAll = vi.fn();

    render(
      <SceneItemList
        items={[createSceneItem()]}
        selectedId="item-1"
        onSelectItem={vi.fn()}
        onDeselectAll={onDeselectAll}
        onDeleteItem={vi.fn()}
      />,
    );

    const deselectButton = screen.getByRole("button", { name: /Deselect/i });
    fireEvent.click(deselectButton);
    expect(onDeselectAll).toHaveBeenCalledTimes(1);
  });

  it("calls onDeleteItem without triggering selection when delete button is clicked", () => {
    const onSelectItem = vi.fn();
    const onDeleteItem = vi.fn();

    render(
      <SceneItemList
        items={[createSceneItem()]}
        selectedId={null}
        onSelectItem={onSelectItem}
        onDeselectAll={vi.fn()}
        onDeleteItem={onDeleteItem}
      />,
    );

    const deleteButton = screen.getByTitle("Delete item");
    fireEvent.click(deleteButton);

    expect(onDeleteItem).toHaveBeenCalledWith("item-1");
    expect(onSelectItem).not.toHaveBeenCalled();
  });

  it("renders empty state when there are no items", () => {
    render(
      <SceneItemList
        items={[]}
        selectedId={null}
        onSelectItem={vi.fn()}
        onDeselectAll={vi.fn()}
        onDeleteItem={vi.fn()}
      />,
    );

    const message = screen.getByText((content) =>
      /No items in scene/i.test(content) || /Pas d'objet sur la scene/i.test(content),
    );
    expect(message).toBeInTheDocument();
  });
});
