import { render, screen, within } from "@testing-library/react";
import { Inspector } from "../../src/components/Inspector";
import * as UiContext from "../../src/context/UiContext";
import * as AnimationContext from "../../src/context/AnimationContext";
import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock FloatingPanel to simplify the test
vi.mock("../../src/components/FloatingPanel", () => ({
  FloatingPanel: ({ title, children }: { title: string; children: React.ReactNode; }) => (
    <div data-testid="floating-panel">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

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

  const createUiMock = (overrides: Record<string, unknown> = {}) => ({
    sceneItems: [],
    selectedItemId: null,
    setSelectedItemId: vi.fn(),
    selectedLimb: "",
    setSelectedLimb: vi.fn(),
    angle: 0,
    setAngle: vi.fn(),
    removeSceneItem: vi.fn(),
    setShowInspector: vi.fn(),
    ...overrides,
  });

  const createAnimationMock = (overrides: Record<string, unknown> = {}) => ({
    currentFrame: 0,
    addKeyframe: vi.fn(),
    getTrack: vi.fn(),
    removeAllTracksForTarget: vi.fn(),
    getValueAtFrame: vi.fn(),
    snapshotKeyframes: vi.fn(),
    ...overrides,
  });

  let useUiSpy: ReturnType<typeof vi.spyOn>;
  let useAnimationSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useUiSpy = vi.spyOn(UiContext, "useUi");
    useAnimationSpy = vi.spyOn(AnimationContext, "useAnimation");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render the inspector with the correct title", () => {
    const uiMock = createUiMock({
      sceneItems: testSceneItems,
      selectedItemId: "1",
    });
    useUiSpy.mockReturnValue(uiMock as never);
    useAnimationSpy.mockReturnValue(createAnimationMock() as never);

    render(<Inspector />);
    expect(screen.getByTestId("floating-panel")).toBeInTheDocument();
    expect(screen.getByText("Inspector")).toBeInTheDocument();
  });

  it("should display the list of scene items", () => {
    const uiMock = createUiMock({
      sceneItems: testSceneItems,
      selectedItemId: "1",
    });
    useUiSpy.mockReturnValue(uiMock as never);
    useAnimationSpy.mockReturnValue(createAnimationMock() as never);

    render(<Inspector />);
    const sceneItemsList = screen.getByText(/Scene Items/).parentElement?.nextElementSibling;
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
    const uiMock = createUiMock({
      sceneItems: testSceneItems,
      selectedItemId: "1",
    });
    useUiSpy.mockReturnValue(uiMock as never);
    useAnimationSpy.mockReturnValue(createAnimationMock() as never);

    render(<Inspector />);
    const propertiesGroup = screen.getByText("Properties").parentElement;
    expect(propertiesGroup).toBeInTheDocument();
    if (propertiesGroup) {
      expect(within(propertiesGroup).getByText("Name")).toBeInTheDocument();
      expect(
        within(propertiesGroup).getByText("Puppet 1"),
      ).toBeInTheDocument();
    }
  });
});
