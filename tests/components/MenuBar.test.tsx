import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  const openMenu = async (label: string) => {
    const trigger = screen.getByRole("menuitem", { name: label });
    fireEvent.pointerDown(trigger);
    fireEvent.pointerUp(trigger);

    await waitFor(() =>
      expect(trigger).toHaveAttribute("data-state", "open"),
    );
  };

  it("should open and close the file menu", async () => {
    render(<MenuBar />);
    await openMenu("File");
    expect(screen.getByText("Save Project")).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByText("Save Project")).not.toBeInTheDocument(),
    );
  });

  it("should call save function on save button click", async () => {
    render(<MenuBar />);
    await openMenu("File");
    const saveButton = await screen.findByText("Save Project");
    fireEvent.click(saveButton);
    await waitFor(() =>
      expect(projectSerializer.serializeProject).toHaveBeenCalled(),
    );
    await waitFor(() =>
      expect(projectSerializer.saveProjectToFile).toHaveBeenCalled(),
    );
  });

  it("should call load function on load button click", async () => {
    render(<MenuBar />);
    await openMenu("File");
    const openButton = await screen.findByText("Open Project");
    fireEvent.click(openButton);
    await waitFor(() =>
      expect(projectSerializer.loadProjectFromFile).toHaveBeenCalled(),
    );
  });

  it("should toggle view panels", async () => {
    render(<MenuBar />);
    await openMenu("View");

    const libraryButton = await screen.findByText("Library");
    fireEvent.click(libraryButton);
    expect(mockUi.setShowLibrary).toHaveBeenCalledWith(false);

    // Re-open menu
    await openMenu("View");
    const inspectorButton = await screen.findByText("Inspector");
    fireEvent.click(inspectorButton);
    expect(mockUi.setShowInspector).toHaveBeenCalledWith(false);
  });
});
