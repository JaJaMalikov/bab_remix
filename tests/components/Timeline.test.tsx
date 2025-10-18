import { render, screen, act } from "@testing-library/react";
import { Timeline } from "../../src/components/Timeline";
import { resetUiState, useUi } from "../../src/context/UiContext";
import * as AnimationContext from "../../src/context/AnimationContext";
import { vi } from "vitest";

describe("Timeline", () => {
  const createAnimationMock = () => ({
    duration: 100,
    currentFrame: 0,
    setCurrentFrame: vi.fn(),
    tracks: [],
    removeKeyframe: vi.fn(),
    playing: false,
    setPlaying: vi.fn(),
    snapshotKeyframes: vi.fn(),
    addKeyframe: vi.fn(),
    getValueAtFrame: vi.fn(),
  });

  beforeEach(() => {
    act(() => {
      resetUiState();
      useUi.setState({
        timelineHeight: 100,
        sceneItems: [],
      });
    });
    vi.spyOn(AnimationContext, "useAnimation").mockReturnValue(
      createAnimationMock() as never,
    );
  });

  afterEach(() => {
    act(() => {
      resetUiState();
    });
    vi.restoreAllMocks();
  });

  it("should render the timeline without crashing", () => {
    render(<Timeline />);
    expect(screen.getByTitle("Lecture")).toBeInTheDocument();
    expect(screen.getByText("Frame")).toBeInTheDocument();
  });
});
