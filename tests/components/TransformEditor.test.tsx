import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransformEditor } from "../../src/components/inspector/TransformEditor";
import type { SceneItem } from "../../src/context/UiContext";
import "@testing-library/jest-dom";

const baseTransform = {
  x: 12.4,
  y: 48.9,
  rotation: 15,
  scaleX: 1.5,
  scaleY: 0.75,
};

const createItem = (overrides: Partial<SceneItem> = {}): SceneItem => ({
  id: "item-1",
  type: "puppet",
  label: "Puppet 1",
  el: document.createElement("div"),
  ...overrides,
});

describe("TransformEditor", () => {
  it("renders only position controls for puppets", () => {
    render(
      <TransformEditor
        selectedItem={createItem()}
        transform={baseTransform}
        handlePositionChange={vi.fn()}
        handleRotationChange={vi.fn()}
        handleScaleChange={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Rotation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Scale X/i)).not.toBeInTheDocument();
  });

  it("shows rotation and scale controls for images", () => {
    render(
      <TransformEditor
        selectedItem={createItem({ type: "image" })}
        transform={baseTransform}
        handlePositionChange={vi.fn()}
        handleRotationChange={vi.fn()}
        handleScaleChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Rotation/i)).toBeInTheDocument();
    expect(screen.getByText(/Scale X/i)).toBeInTheDocument();
  });

  it("calls handlePositionChange when updating coordinates", () => {
    const handlePositionChange = vi.fn();

    render(
      <TransformEditor
        selectedItem={createItem()}
        transform={baseTransform}
        handlePositionChange={handlePositionChange}
        handleRotationChange={vi.fn()}
        handleScaleChange={vi.fn()}
      />,
    );

    const [xInput, yInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(xInput, { target: { value: "42" } });
    fireEvent.change(yInput, { target: { value: "99" } });

    expect(handlePositionChange).toHaveBeenNthCalledWith(1, "x", 42);
    expect(handlePositionChange).toHaveBeenNthCalledWith(2, "y", 99);
  });

  it("calls rotation and scale handlers for images", () => {
    const handleRotationChange = vi.fn();
    const handleScaleChange = vi.fn();

    render(
      <TransformEditor
        selectedItem={createItem({ type: "image" })}
        transform={baseTransform}
        handlePositionChange={vi.fn()}
        handleRotationChange={handleRotationChange}
        handleScaleChange={handleScaleChange}
      />,
    );

    const inputs = screen.getAllByRole("spinbutton");
    const rotationInput = inputs[2]!;
    fireEvent.change(rotationInput, { target: { value: "30" } });

    expect(handleRotationChange).toHaveBeenCalledWith(30);

    const scaleXInput = screen.getByDisplayValue(baseTransform.scaleX.toFixed(2));
    fireEvent.change(scaleXInput, { target: { value: "2.00" } });
    expect(handleScaleChange).toHaveBeenCalledWith("scaleX", 2);
  });
});
