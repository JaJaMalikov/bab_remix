import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Library } from "../../src/components/Library";
import * as UiContext from "../../src/context/UiContext";
import { vi } from "vitest";

// Mock child components
vi.mock("../../src/components/FloatingPanel", () => ({
  FloatingPanel: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="floating-panel">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("../../src/components/AssetItem", () => ({
  AssetItem: ({ asset }: { asset: { name: string } }) => (
    <div data-testid="asset-item">{asset.name}</div>
  ),
}));

const mockManifest = [
  { name: "Puppet 1", path: "puppets/p1.svg", category: "pantins" },
  { name: "Object 1", path: "objects/o1.svg", category: "objets" },
  { name: "Decor 1", path: "decors/d1.png", category: "decors" },
];

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve(mockManifest),
  }),
) as any;

describe("Library", () => {
  const mockUi = {
    setShowLibrary: vi.fn(),
  };

  beforeEach(() => {
    vi.spyOn(UiContext, "useUi").mockReturnValue(mockUi as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render the library and fetch assets", async () => {
    render(<Library />);
    expect(screen.getByText("Library")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Puppet 1")).toBeInTheDocument();
    });

    const objetsTab = screen.getByRole("tab", { name: "Objets" });
    await act(async () => {
      objetsTab.focus();
      fireEvent.keyDown(objetsTab, { key: "Enter" });
    });
    await waitFor(() => {
      expect(screen.getByText("Object 1")).toBeInTheDocument();
    });

    const decorsTab = screen.getByRole("tab", { name: "Décors" });
    await act(async () => {
      decorsTab.focus();
      fireEvent.keyDown(decorsTab, { key: "Enter" });
    });
    await waitFor(() => {
      expect(screen.getByText("Decor 1")).toBeInTheDocument();
    });
  });

  it("should filter assets by category", async () => {
    render(<Library />);
    await waitFor(() =>
      expect(screen.getByText("Puppet 1")).toBeInTheDocument(),
    );

    const objetsTab = screen.getByRole("tab", { name: "Objets" });
    await act(async () => {
      objetsTab.focus();
      fireEvent.keyDown(objetsTab, { key: "Enter" });
    });

    expect(screen.queryByText("Puppet 1")).not.toBeInTheDocument();
    expect(screen.getByText("Object 1")).toBeInTheDocument();
    expect(screen.queryByText("Decor 1")).not.toBeInTheDocument();
  });

  it("should restore puppet assets when returning to the Pantins tab", async () => {
    render(<Library />);
    await waitFor(() =>
      expect(screen.getByText("Puppet 1")).toBeInTheDocument(),
    );

    const objetsTab = screen.getByRole("tab", { name: "Objets" });
    await act(async () => {
      objetsTab.focus();
      fireEvent.keyDown(objetsTab, { key: "Enter" });
    });
    await waitFor(() =>
      expect(screen.getByText("Object 1")).toBeInTheDocument(),
    );

    const pantinsTab = screen.getByRole("tab", { name: "Pantins" });
    await act(async () => {
      pantinsTab.focus();
      fireEvent.keyDown(pantinsTab, { key: "Enter" });
    });
    await waitFor(() =>
      expect(screen.getByText("Puppet 1")).toBeInTheDocument(),
    );
  });
});
