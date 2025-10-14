import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    render(<MenuBar />);
    const fileMenuButton = screen.getByRole("menuitem", { name: "File" });
    await act(async () => {
      fileMenuButton.focus();
      fireEvent.keyDown(fileMenuButton, { key: "ArrowDown" });
    });

    expect(
      await screen.findByRole("menuitem", { name: /save project/i }),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("menuitem", { name: /save project/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("should call save function on save button click", async () => {
    render(<MenuBar />);
    const fileTrigger = screen.getByRole("menuitem", { name: "File" });
    await act(async () => {
      fileTrigger.focus();
      fireEvent.keyDown(fileTrigger, { key: "ArrowDown" });
    });
    const saveButton = await screen.findByRole("menuitem", {
      name: /save project/i,
    });
    await act(async () => {
      fireEvent.click(saveButton);
    });
    await waitFor(() =>
      expect(projectSerializer.serializeProject).toHaveBeenCalled(),
    );
    await waitFor(() =>
      expect(projectSerializer.saveProjectToFile).toHaveBeenCalled(),
    );
  });

  it("should call load function on load button click", async () => {
    render(<MenuBar />);
    const fileTrigger = screen.getByRole("menuitem", { name: "File" });
    await act(async () => {
      fileTrigger.focus();
      fireEvent.keyDown(fileTrigger, { key: "ArrowDown" });
    });
    const openButton = await screen.findByRole("menuitem", {
      name: /open project/i,
    });
    await act(async () => {
      fireEvent.click(openButton);
    });
    await waitFor(() =>
      expect(projectSerializer.loadProjectFromFile).toHaveBeenCalled(),
    );
  });

  it("should toggle view panels", async () => {
    render(<MenuBar />);
    const viewTrigger = screen.getByRole("menuitem", { name: "View" });
    await act(async () => {
      viewTrigger.focus();
      fireEvent.keyDown(viewTrigger, { key: "ArrowDown" });
    });

    const libraryButton = await screen.findByRole("menuitemcheckbox", {
      name: /library/i,
    });
    await act(async () => {
      fireEvent.click(libraryButton);
    });
    expect(mockUi.setShowLibrary).toHaveBeenCalledWith(false);

    // Re-open menu
    await act(async () => {
      viewTrigger.focus();
      fireEvent.keyDown(viewTrigger, { key: "ArrowDown" });
    });
    const inspectorButton = await screen.findByRole("menuitemcheckbox", {
      name: /inspector/i,
    });
    await act(async () => {
      fireEvent.click(inspectorButton);
    });
    expect(mockUi.setShowInspector).toHaveBeenCalledWith(false);
  });
});
