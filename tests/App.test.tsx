import { render, screen, act, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import "@testing-library/jest-dom";

import App from "../src/App";
import { resetUiState, useUi } from "../src/context/UiContext";

vi.mock("../src/hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock("../src/components/SvgScene", () => ({
  SvgScene: () => <div data-testid="svg-scene">Scene</div>,
}));

vi.mock("../src/components/Inspector", () => ({
  Inspector: () => <div data-testid="inspector-panel">Inspector</div>,
}));

vi.mock("../src/components/Layers", () => ({
  Layers: () => <div data-testid="layers-panel">Layers</div>,
}));

vi.mock("../src/components/Timeline", () => ({
  Timeline: () => <div data-testid="timeline-view">Timeline</div>,
}));

vi.mock("../src/components/PlaybackMini", () => ({
  PlaybackMini: () => <div data-testid="playback-view">Playback</div>,
}));

vi.mock("../src/components/layout/side-panel", () => ({
  SidePanel: ({ title, children }: { title?: string; children: ReactNode }) => (
    <aside data-testid="side-panel" data-title={title ?? ""}>
      {children}
    </aside>
  ),
}));

vi.mock("../src/components/layout/app-layout", () => ({
  AppLayout: ({
    children,
    sidePanel,
    timeline,
  }: {
    children: ReactNode;
    sidePanel?: ReactNode;
    timeline?: ReactNode;
  }) => (
    <div>
      <div data-testid="main-slot">{children}</div>
      <div data-testid="side-slot">{sidePanel ?? null}</div>
      <div data-testid="timeline-slot">{timeline ?? null}</div>
    </div>
  ),
}));

vi.mock("../src/components/features/library-panel", () => ({
  LibraryPanel: () => <div data-testid="library-panel">Library</div>,
}));

vi.mock("../src/components/ErrorBoundary", () => ({
  ErrorBoundary: ({
    children,
    message,
  }: {
    children: ReactNode;
    message: string;
  }) => (
    <div data-testid={`error-boundary-${message}`}>
      <span>{message}</span>
      <div data-testid="boundary-content">{children}</div>
    </div>
  ),
}));

describe("App", () => {
  beforeEach(() => {
    act(() => resetUiState());
  });

  afterEach(() => {
    cleanup();
    act(() => resetUiState());
  });

  it("affiche la bibliothèque par défaut et la timeline", () => {
    render(<App />);

    expect(screen.getByTestId("svg-scene")).toBeInTheDocument();
    expect(screen.getByTestId("library-panel")).toBeInTheDocument();
    expect(screen.getByTestId("side-panel")).toHaveTextContent("Library");
    expect(screen.getByTestId("timeline-view")).toBeInTheDocument();
  });

  it("affiche l'inspecteur quand il est actif", () => {
    act(() => {
      useUi.setState({
        showLibrary: false,
        showInspector: true,
        showLayers: false,
      });
    });

    render(<App />);

    expect(screen.queryByTestId("library-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("inspector-panel")).toBeInTheDocument();
    expect(screen.getByTestId("side-panel")).toHaveTextContent("Inspector");
  });

  it("affiche le volet des calques quand demandé", () => {
    act(() => {
      useUi.setState({
        showLibrary: false,
        showInspector: false,
        showLayers: true,
      });
    });

    render(<App />);

    expect(screen.getByTestId("layers-panel")).toBeInTheDocument();
    expect(screen.getByTestId("side-panel")).toHaveAttribute("data-title", "Layers");
  });

  it("affiche les contrôles de lecture quand la timeline est masquée", () => {
    act(() => {
      useUi.setState({ showTimeline: false });
    });

    render(<App />);

    expect(screen.getByTestId("playback-view")).toBeInTheDocument();
    expect(screen.queryByTestId("timeline-view")).not.toBeInTheDocument();
  });
});
