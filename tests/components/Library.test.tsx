import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LibraryPanel } from "../../src/components/features/library-panel";
import { vi } from "vitest";

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

describe("LibraryPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render library tabs and assets", async () => {
    render(<LibraryPanel />);
    await waitFor(() => {
      expect(screen.getByText("Puppet 1")).toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: /Pantins/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Objets/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Décors/i })).toBeInTheDocument();
  });

  it("should filter assets when switching category", async () => {
    const user = userEvent.setup();
    render(<LibraryPanel />);
    await waitFor(() =>
      expect(screen.getByText("Puppet 1")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("tab", { name: /Objets/i }));
    await waitFor(() => {
      expect(screen.getByText("Object 1")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText("Puppet 1")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /Décors/i }));
    await waitFor(() => {
      expect(screen.getByText("Decor 1")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText("Object 1")).not.toBeInTheDocument();
    });
  });
});
