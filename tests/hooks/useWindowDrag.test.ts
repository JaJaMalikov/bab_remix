import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useWindowDrag } from "../../src/hooks/useWindowDrag";

describe("useWindowDrag", () => {
  it("enregistre et nettoie les écouteurs globaux quand l'état change", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const onMove = vi.fn();
    const onUp = vi.fn();

    const { rerender, unmount } = renderHook(
      ({ active }) => useWindowDrag(active, onMove, onUp),
      { initialProps: { active: false } },
    );

    expect(addSpy).not.toHaveBeenCalled();

    rerender({ active: true });
    expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));

    const moveHandler = addSpy.mock.calls.find(
      (args) => args[0] === "mousemove",
    )?.[1] as (event: MouseEvent) => void;
    const upHandler = addSpy.mock.calls.find(
      (args) => args[0] === "mouseup",
    )?.[1] as (event: MouseEvent) => void;

    act(() => {
      moveHandler?.(new MouseEvent("mousemove"));
      upHandler?.(new MouseEvent("mouseup"));
    });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onUp).toHaveBeenCalledTimes(1);

    unmount();
    expect(removeSpy).toHaveBeenCalledWith("mousemove", moveHandler);
    expect(removeSpy).toHaveBeenCalledWith("mouseup", upHandler);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
