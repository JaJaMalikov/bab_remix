import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import "@testing-library/jest-dom";

const useWindowDragMock = vi.hoisted(() =>
  vi.fn<
    void,
    [boolean, (event: MouseEvent) => void, (event: MouseEvent) => void]
  >(),
);

vi.mock("../../src/hooks/useWindowDrag", () => ({
  useWindowDrag: useWindowDragMock,
}));

import { useResizable } from "../../src/hooks/useResizable";

const Harness = ({
  storageKey,
  initialSize = { width: 200, height: 150 },
  children,
}: {
  storageKey?: string;
  initialSize?: { width: number; height: number };
  children?: ReactNode;
}) => {
  const { size, onResizeMouseDown, isResizing } = useResizable(initialSize, {
    storageKey,
  });

  return (
    <div data-testid="resizable" data-resizing={isResizing}>
      <output data-testid="size-output">
        {size.width}×{size.height}
      </output>
      <button
        type="button"
        data-testid="resize-handle"
        onMouseDown={onResizeMouseDown}
      >
        {children ?? "resize"}
      </button>
    </div>
  );
};

const latestWindowDrag = () => {
  const call = useWindowDragMock.mock.calls.at(-1);
  if (!call) {
    throw new Error("useWindowDrag not called");
  }
  return {
    active: call[0],
    move: call[1],
    up: call[2],
  };
};

const resetWindowSize = () => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 768,
  });
};

describe("useResizable", () => {
  beforeEach(() => {
    localStorage.clear();
    useWindowDragMock.mockReset();
    cleanup();
    resetWindowSize();
  });

  it("restaure la taille depuis le stockage et persiste à la fin du redimensionnement", () => {
    localStorage.setItem("panel:size", JSON.stringify({ width: 320, height: 240 }));

    render(<Harness storageKey="panel" initialSize={{ width: 180, height: 120 }} />);

    expect(screen.getByTestId("size-output")).toHaveTextContent("320×240");
    expect(useWindowDragMock).toHaveBeenCalledWith(
      false,
      expect.any(Function),
      expect.any(Function),
    );

    const handle = screen.getByTestId("resize-handle");
    fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });
    const { move, up } = latestWindowDrag();

    expect(latestWindowDrag().active).toBe(true);
    expect(screen.getByTestId("resizable")).toHaveAttribute("data-resizing", "true");

    act(() => {
      move(new MouseEvent("mousemove", { clientX: 220, clientY: 260 }));
    });

    expect(screen.getByTestId("size-output")).toHaveTextContent("440×400");

    act(() => up(new MouseEvent("mouseup")));

    expect(screen.getByTestId("resizable")).toHaveAttribute(
      "data-resizing",
      "false",
    );

    expect(JSON.parse(localStorage.getItem("panel:size") ?? "{}")).toEqual({
      width: 440,
      height: 400,
    });
  });

  it("applique une taille minimale et ignore les clics hors poignée", () => {
    render(
      <Harness storageKey="min" initialSize={{ width: 110, height: 110 }}>
        handle
      </Harness>,
    );

    const container = screen.getByTestId("resizable");
    fireEvent.mouseDown(container, { clientX: 10, clientY: 10 });
    expect(latestWindowDrag().active).toBe(false);

    const handle = screen.getByTestId("resize-handle");
    fireEvent.mouseDown(handle, { clientX: 200, clientY: 200 });
    const { move } = latestWindowDrag();

    act(() => {
      move(new MouseEvent("mousemove", { clientX: 50, clientY: 40 }));
    });

    // width/height should respect the minimum of 100px
    expect(screen.getByTestId("size-output")).toHaveTextContent("100×100");
  });
});
