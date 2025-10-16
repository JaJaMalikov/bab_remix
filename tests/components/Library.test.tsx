import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

  const getPanel = (label: string) => {
    const labelNode = screen.getByText(label);
    const trigger = labelNode.closest('[role="tab"]');
    if (!trigger) {
      throw new Error(`No trigger element found for ${label}`);
    }
    const triggerId = trigger.getAttribute("id");
    if (!triggerId) {
      throw new Error(`No trigger id available for ${label}`);
    }
    const panel = document.querySelector<HTMLElement>(
      `[role="tabpanel"][aria-labelledby="${triggerId}"]`,
    );
    if (!panel) {
      throw new Error(`Unable to locate panel associated with ${label}`);
    }
    return panel;
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

    await waitFor(() =>
      expect(within(getPanel("Pantins")).getByText("Puppet 1")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("tab", { name: "Objets" }));
    await waitFor(() =>
      expect(within(getPanel("Objets")).getByText("Object 1")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("tab", { name: "Décors" }));
    await waitFor(() =>
      expect(within(getPanel("Décors")).getByText("Decor 1")).toBeInTheDocument(),
    );
  });

  it("should filter assets by category", async () => {
    render(<Library />);
    await waitFor(() =>
      expect(within(getPanel("Pantins")).getByText("Puppet 1")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("tab", { name: "Objets" }));
    const objetsPanel = getPanel("Objets");
    expect(within(objetsPanel).getByText("Object 1")).toBeInTheDocument();
    expect(within(objetsPanel).queryByText("Puppet 1")).not.toBeInTheDocument();
    expect(within(objetsPanel).queryByText("Decor 1")).not.toBeInTheDocument();
  });

  it("should filter assets by search query", async () => {
    render(<Library />);
    const pantinsPanel = getPanel("Pantins");
    await waitFor(() =>
      expect(within(pantinsPanel).getByText("Puppet 1")).toBeInTheDocument(),
    );

    const searchInput = screen.getByPlaceholderText("Rechercher...");
    fireEvent.change(searchInput, { target: { value: "Puppet" } });

    expect(within(pantinsPanel).getByText("Puppet 1")).toBeInTheDocument();
    expect(screen.queryByText("Object 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Decor 1")).not.toBeInTheDocument();
  });
});
