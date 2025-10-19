import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Timeline } from "../../src/components/Timeline";
import { useUi, resetUiState } from "../../src/context/UiContext";
import * as AnimationContext from "../../src/context/AnimationContext";

describe("Timeline", () => {
  const createAnimationMock = (props: Partial<AnimationContext.AnimationState> = {}) => ({
    duration: 300,
    currentFrame: 0,
    tracks: [],
    playing: false,
    setPlaying: vi.fn(),
    setCurrentFrame: vi.fn(),
    snapshotKeyframes: vi.fn(),
    addKeyframe: vi.fn(),
    getValueAtFrame: vi.fn(),
    removeAllTracksForTarget: vi.fn(),
    removeKeyframe: vi.fn(),
    getTrack: vi.fn(),
    ...props,
  });

  let animationMock: ReturnType<typeof createAnimationMock>;

  beforeEach(() => {
    animationMock = createAnimationMock();
    vi.spyOn(AnimationContext, "useAnimation").mockReturnValue(
      animationMock as never,
    );
    resetUiState();
    useUi.setState({ timelineHeight: 100, sceneItems: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render playback controls", () => {
    render(<Timeline />);
    expect(screen.getByTitle("Lecture")).toBeInTheDocument();
    expect(screen.getByTitle("Revenir au début")).toBeInTheDocument();
    expect(screen.getByText(/Durée/)).toBeInTheDocument();
  });

  it('should show pause button when playing', () => {
    animationMock = createAnimationMock({ playing: true });
    vi.spyOn(AnimationContext, 'useAnimation').mockReturnValue(animationMock as never);
    render(<Timeline />);
    expect(screen.getByTitle("Mettre en pause")).toBeInTheDocument();
  });

  it("should call setPlaying(true) when play button is clicked", () => {
    render(<Timeline />);
    const playButton = screen.getByTitle("Lecture");
    fireEvent.click(playButton);
    expect(animationMock.setPlaying).toHaveBeenCalledWith(true);
  });

  it("should call setPlaying(false) when pause button is clicked", () => {
    animationMock = createAnimationMock({ playing: true });
    vi.spyOn(AnimationContext, 'useAnimation').mockReturnValue(animationMock as never);
    render(<Timeline />);
    const pauseButton = screen.getByTitle("Mettre en pause");
    fireEvent.click(pauseButton);
    expect(animationMock.setPlaying).toHaveBeenCalledWith(false);
  });

  it("should call setCurrentFrame(0) when stop button is clicked", () => {
    render(<Timeline />);
    const stopButton = screen.getByTitle("Revenir au début");
    fireEvent.click(stopButton);
    expect(animationMock.setCurrentFrame).toHaveBeenCalledWith(0);
  });

  it("should render tracks when there are scene items", () => {
    useUi.setState({
      sceneItems: [
        {
          id: "item-1",
          type: "image",
          label: "Image 1",
          el: document.createElement("div"),
        },
      ],
    });
    render(<Timeline />);
    const trackLabel = screen.getByText("Image 1");
    expect(trackLabel).toBeInTheDocument();
    expect(trackLabel.closest(".timeline-track-label")).not.toBeNull();
  });

  it("should not render tracks when there are no scene items", () => {
    render(<Timeline />);
    expect(screen.queryByText("Image 1")).not.toBeInTheDocument();
  });

  describe("Keyframe Navigation", () => {
    it("should disable prev/next keyframe buttons when no keyframes are present", () => {
      render(<Timeline />);
      expect(screen.getByTitle("Keyframe précédente")).toBeDisabled();
      expect(screen.getByTitle("Keyframe suivante")).toBeDisabled();
    });

    it("should enable next keyframe button when a future keyframe exists", () => {
      animationMock = createAnimationMock({
        currentFrame: 10,
        tracks: [
          {
            id: "track-1",
            targetId: "item-1",
            targetMemberId: null,
            property: "x",
            keyframes: [{ frame: 50, value: 100 }],
          },
        ],
      });
      vi.spyOn(AnimationContext, "useAnimation").mockReturnValue(
        animationMock as never,
      );
      render(<Timeline />);
      expect(screen.getByTitle("Keyframe précédente")).toBeDisabled();
      expect(screen.getByTitle("Keyframe suivante")).not.toBeDisabled();
    });

    it("should navigate to the next keyframe", () => {
      animationMock = createAnimationMock({
        currentFrame: 10,
        tracks: [
          {
            id: "track-1",
            targetId: "item-1",
            targetMemberId: null,
            property: "x",
            keyframes: [{ frame: 50, value: 100 }],
          },
        ],
      });
      vi.spyOn(AnimationContext, "useAnimation").mockReturnValue(
        animationMock as never,
      );
      render(<Timeline />);
      const nextButton = screen.getByTitle("Keyframe suivante");
      fireEvent.click(nextButton);
      expect(animationMock.setCurrentFrame).toHaveBeenCalledWith(50);
    });
  });
});
