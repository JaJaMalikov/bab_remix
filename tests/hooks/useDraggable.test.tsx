import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import "@testing-library/jest-dom";

const useWindowDragMock = vi.hoisted(() =>
  vi.fn<
    void,
    [boolean, (event: MouseEvent) => void, (event: MouseEvent) => void]
  >()
);

vi.mock("../../src/hooks/useWindowDrag", () => ({
  useWindowDrag: useWindowDragMock,
}));

import { useDraggable } from "../../src/hooks/useDraggable";

const initialPos = { x: 32, y: 48 };

const Harness = ({
  children,
  storageKey,
  panelWidth,
  panelHeight,
}: {
  children?: ReactNode;
  storageKey?: string;
  panelWidth?: number;
  panelHeight?: number;
}) => {
  const { position, handleMouseDown, isDragging } = useDraggable(
    initialPos,
    { storageKey, panelWidth, panelHeight },
  );

  return (
    <div
      data-testid="draggable"
      data-dragging={isDragging}
      onMouseDown={handleMouseDown}
    >
      <div className="drag-handle" data-testid="drag-handle">
        {children}
      </div>
      <output data-testid="position">
        {`${position.x},${position.y}`}
      </output>
    </div>
  );
};

const getLatestWindowDragArgs = () => {
  const call = useWindowDragMock.mock.calls.at(-1);
  if (!call) throw new Error("useWindowDrag not called");
  return {
    isActive: call[0],
    move: call[1],
    up: call[2],
  };
};

describe("useDraggable", () => {
  beforeEach(() => {
    localStorage.clear();
    useWindowDragMock.mockReset();
    cleanup();
  });

  it("charge la position sauvegardée, gère le déplacement et persiste à la fin", () => {
    localStorage.setItem("panel:pos", JSON.stringify({ x: 120, y: 160 }));

    render(
      <Harness storageKey="panel:pos" panelWidth={300} panelHeight={400} />,
    );

    expect(screen.getByTestId("position")).toHaveTextContent("120,160");
    expect(useWindowDragMock).toHaveBeenCalledWith(
      false,
      expect.any(Function),
      expect.any(Function),
    );

    const handle = screen.getByTestId("drag-handle");
    fireEvent.mouseDown(handle, { clientX: 140, clientY: 190 });

    const { move, up } = getLatestWindowDragArgs();
    expect(getLatestWindowDragArgs().isActive).toBe(true);

    act(() => {
      move(new MouseEvent("mousemove", { clientX: 200, clientY: 260 }));
    });

    expect(screen.getByTestId("position")).toHaveTextContent("180,230");
    expect(screen.getByTestId("draggable")).toHaveAttribute(
      "data-dragging",
      "true",
    );

    act(() => {
      up(new MouseEvent("mouseup"));
    });

    expect(screen.getByTestId("draggable")).toHaveAttribute(
      "data-dragging",
      "false",
    );
    expect(JSON.parse(localStorage.getItem("panel:pos") ?? "{}")).toEqual({
      x: 180,
      y: 230,
    });
  });

  it("effectue l'accroche automatique aux bords et ignore les clics hors poignée", () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 400,
    });

    render(
      <Harness storageKey="panel:snap" panelWidth={200} panelHeight={200} />,
    );

    const container = screen.getByTestId("draggable");
    fireEvent.mouseDown(container, { clientX: 50, clientY: 50 });
    expect(getLatestWindowDragArgs().isActive).toBe(false);

    const handle = screen.getByTestId("drag-handle");
    fireEvent.mouseDown(handle, { clientX: 82, clientY: 95 });
    const { move, up } = getLatestWindowDragArgs();

    act(() => {
      move(new MouseEvent("mousemove", { clientX: 320, clientY: 225 }));
    });

    expect(screen.getByTestId("position")).toHaveTextContent("300,200");

    act(() => up(new MouseEvent("mouseup")));

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalWidth,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalHeight,
    });
  });
});
