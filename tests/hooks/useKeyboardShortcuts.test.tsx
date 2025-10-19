import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, beforeEach, expect, vi } from "vitest";
import "@testing-library/jest-dom";

import { UiProvider, resetUiState, useUi } from "../../src/context/UiContext";
import { AnimationProvider, useAnimation } from "../../src/context/AnimationContext";
import { useKeyboardShortcuts } from "../../src/hooks/useKeyboardShortcuts";

const KeyboardHarness = () => {
  useKeyboardShortcuts();
  const { showLibrary, showInspector, showLayers } = useUi();
  const { playing, currentFrame } = useAnimation();

  return (
    <div>
      <output data-testid="library-flag">{String(showLibrary)}</output>
      <output data-testid="inspector-flag">{String(showInspector)}</output>
      <output data-testid="layers-flag">{String(showLayers)}</output>
      <output data-testid="playing-flag">{String(playing)}</output>
      <output data-testid="frame-value">{currentFrame}</output>
    </div>
  );
};

const renderWithProviders = () =>
  render(
    <UiProvider>
      <AnimationProvider>
        <KeyboardHarness />
      </AnimationProvider>
    </UiProvider>,
  );

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    act(() => resetUiState());
  });

  it("active la bibliothèque et désactive les autres panneaux", () => {
    const fitInView = vi.fn();
    act(() => {
      useUi.setState({
        showLibrary: false,
        showInspector: true,
        showLayers: true,
        fitInView,
      });
    });

    renderWithProviders();

    fireEvent.keyDown(window, { key: "l", ctrlKey: true });
    expect(screen.getByTestId("library-flag")).toHaveTextContent("true");
    expect(screen.getByTestId("inspector-flag")).toHaveTextContent("false");
    expect(screen.getByTestId("layers-flag")).toHaveTextContent("false");

    fireEvent.keyDown(window, { key: "0", ctrlKey: true });
    expect(fitInView).toHaveBeenCalledTimes(1);
  });

  it("contrôle la lecture et la navigation dans la timeline", () => {
    renderWithProviders();

    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByTestId("playing-flag")).toHaveTextContent("true");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("frame-value")).toHaveTextContent("1");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("frame-value")).toHaveTextContent("0");

    fireEvent.keyDown(window, { key: "End" });
    expect(screen.getByTestId("frame-value")).toHaveTextContent("299");

    fireEvent.keyDown(window, { key: "Home" });
    expect(screen.getByTestId("frame-value")).toHaveTextContent("0");
  });
});
