import { render, screen, within, act } from "@testing-library/react";
import { Inspector } from "../../src/components/Inspector";
import { resetUiState, useUi } from "../../src/context/UiContext";
import * as AnimationContext from "../../src/context/AnimationContext";
import { vi } from "vitest";
import "@testing-library/jest-dom";

describe("Inspector", () => {
  const testSceneItems = [
    {
      id: "1",
      type: "puppet" as const,
      label: "Puppet 1",
      el: document.createElementNS("http://www.w3.org/2000/svg", "g"),
    },
    {
      id: "2",
      type: "image" as const,
      label: "Image 1",
      el: document.createElementNS("http://www.w3.org/2000/svg", "image"),
    },
  ];

  const createAnimationMock = (overrides: Record<string, unknown> = {}) => ({
    currentFrame: 0,
    addKeyframe: vi.fn(),
    getTrack: vi.fn(),
    removeAllTracksForTarget: vi.fn(),
    getValueAtFrame: vi.fn(),
    snapshotKeyframes: vi.fn(),
    ...overrides,
  });

  let animationSpy: ReturnType<typeof vi.spyOn>;
  let animationMock: ReturnType<typeof createAnimationMock>;

  beforeEach(() => {
    act(() => {
      resetUiState();
    });
    animationMock = createAnimationMock();
    animationSpy = vi.spyOn(AnimationContext, "useAnimation");
    animationSpy.mockReturnValue(animationMock as never);
  });

  afterEach(() => {
    act(() => {
      resetUiState();
    });
    vi.restoreAllMocks();
  });

  it("should render the inspector sections", () => {
    act(() => {
      useUi.setState({
        sceneItems: testSceneItems,
        selectedItemId: "1",
      });
    });

    render(<Inspector />);
    expect(screen.getByText(/ITEMS \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getAllByTitle(/Delete item/i)[0]).toBeInTheDocument();
  });

  it("should display the list of scene items", () => {
    act(() => {
      useUi.setState({
        sceneItems: testSceneItems,
        selectedItemId: "1",
      });
    });

    render(<Inspector />);
    const sceneItemsList = screen
      .getByText(/ITEMS/)
      .parentElement?.nextElementSibling;
    expect(sceneItemsList).toBeInTheDocument();
    if (sceneItemsList) {
      expect(
        within(sceneItemsList as HTMLElement).getByRole("button", { name: /Puppet 1/ }),
      ).toBeInTheDocument();
      expect(
        within(sceneItemsList as HTMLElement).getByRole("button", { name: /Image 1/ }),
      ).toBeInTheDocument();
    }
  });

  it("should display properties for the selected item", () => {
    act(() => {
      useUi.setState({
        sceneItems: testSceneItems,
        selectedItemId: "1",
      });
    });

    render(<Inspector />);
    const propertiesGroup = screen.getByText("Name").parentElement;
    expect(propertiesGroup).toBeInTheDocument();
    if (propertiesGroup) {
      expect(within(propertiesGroup).getByText("Name")).toBeInTheDocument();
      expect(
        within(propertiesGroup).getByText("Puppet 1"),
      ).toBeInTheDocument();
    }
  });
});
