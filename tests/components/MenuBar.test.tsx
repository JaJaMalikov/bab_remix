import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MenuBar } from "../../src/components/MenuBar";
import * as UiContext from "../../src/context/UiContext";
import * as AnimationContext from "../../src/context/AnimationContext";
import * as projectSerializer from "../../src/utils/projectSerializer";
import { vi } from "vitest";

// Mock the entire module
vi.mock("../../src/utils/projectSerializer", () => ({
  serializeProject: vi.fn(),
  saveProjectToFile: vi.fn(),
  loadProjectFromFile: vi.fn(),
}));

describe("MenuBar", () => {
  const mockUi = {
    showTimeline: true,
    setShowTimeline: vi.fn(),
    showLibrary: true,
    setShowLibrary: vi.fn(),
    showInspector: true,
    setShowInspector: vi.fn(),
    showLayers: true,
    setShowLayers: vi.fn(),
    fitInView: vi.fn(),
    sceneItems: [],
  };

  const mockAnimation = {
    tracks: [],
    duration: 100,
  };

  beforeEach(() => {
    vi.spyOn(UiContext, "useUi").mockReturnValue(mockUi as any);
    vi.spyOn(AnimationContext, "useAnimation").mockReturnValue(
      mockAnimation as any,
    );
    (projectSerializer.loadProjectFromFile as vi.Mock).mockResolvedValue({
      scene: { items: [] },
      tracks: [],
      duration: 0,
    });
    window.confirm = vi.fn(() => true);
    window.URL.createObjectURL = vi.fn(() => "mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render the menu bar", () => {
    render(<MenuBar />);
    expect(screen.getByText("File")).toBeInTheDocument();
    expect(screen.getByText("View")).toBeInTheDocument();
  });

  it("should open and close the file menu", async () => {
    const user = userEvent.setup();
    render(<MenuBar />);
    const fileMenuButton = screen.getByRole("button", { name: "File" });
    await user.click(fileMenuButton);
    const saveMenuItem = await screen.findByRole("menuitem", {
      name: /Save Project/i,
    });
    expect(saveMenuItem).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(
        screen.queryByRole("menuitem", { name: /Save Project/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("should call save function on save button click", async () => {
    const user = userEvent.setup();
    render(<MenuBar />);
    await user.click(screen.getByRole("button", { name: "File" }));
    const saveButton = await screen.findByRole("menuitem", {
      name: /Save Project/i,
    });
    await user.click(saveButton);
    await waitFor(() =>
      expect(projectSerializer.serializeProject).toHaveBeenCalled(),
    );
    await waitFor(() =>
      expect(projectSerializer.saveProjectToFile).toHaveBeenCalled(),
    );
  });

  it("should call load function on load button click", async () => {
    const user = userEvent.setup();
    render(<MenuBar />);
    await user.click(screen.getByRole("button", { name: "File" }));
    const openButton = await screen.findByRole("menuitem", {
      name: /Open Project/i,
    });
    await user.click(openButton);
    await waitFor(() =>
      expect(projectSerializer.loadProjectFromFile).toHaveBeenCalled(),
    );
  });

  it("should toggle view panels", async () => {
    const user = userEvent.setup();
    render(<MenuBar />);
    await user.click(screen.getByRole("button", { name: "View" }));

    const libraryButton = await screen.findByRole("menuitemcheckbox", {
      name: "Library",
    });
    await user.click(libraryButton);
    expect(mockUi.setShowLibrary).toHaveBeenCalledWith(false);

    // Re-open menu
    await user.click(screen.getByRole("button", { name: "View" }));
    const inspectorButton = await screen.findByRole("menuitemcheckbox", {
      name: "Inspector",
    });
    await user.click(inspectorButton);
    expect(mockUi.setShowInspector).toHaveBeenCalledWith(false);
  });
});
