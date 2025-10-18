import { render, screen, act } from "@testing-library/react";
import { SvgScene } from "../../src/components/SvgScene";
import { resetUiState, useUi } from "../../src/context/UiContext";
import * as AnimationContext from "../../src/context/AnimationContext";
import { vi } from "vitest";

describe("SvgScene", () => {
  beforeEach(() => {
    act(() => {
      resetUiState();
      useUi.setState({
        selectedPuppet: null,
        selectedLimb: "",
        angle: 0,
        sceneItems: [],
        addSceneItem: vi.fn(),
        setSelectedPuppet: vi.fn(),
        setSelectedLimb: vi.fn(),
        setAngle: vi.fn(),
        setSelectedItemId: vi.fn(),
        setFitInView: vi.fn(),
        setImportAsset: vi.fn(),
      });
    });

    vi.spyOn(AnimationContext, "useAnimation").mockReturnValue({
      currentFrame: 0,
      addKeyframe: vi.fn(),
      snapshotKeyframes: vi.fn(),
      tracks: [], // This was missing
      getValueAtFrame: vi.fn(), // This was also used by the hook
    } as any);
  });

  afterEach(() => {
    act(() => {
      resetUiState();
    });
    vi.restoreAllMocks();
  });

  it("should render without crashing", () => {
    render(<SvgScene />);
    expect(screen.getByTestId("scene-canvas")).toBeInTheDocument();
  });
});
