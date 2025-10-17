import { render, screen, fireEvent } from "@testing-library/react";
import { PlaybackMini } from "../../src/components/PlaybackMini";
import * as AnimationContext from "../../src/context/AnimationContext";
import { vi } from "vitest";

describe("PlaybackMini", () => {
  const mockAnimation = {
    playing: false,
    setPlaying: vi.fn(),
    currentFrame: 42,
    setCurrentFrame: vi.fn(),
  };

  beforeEach(() => {
    vi.spyOn(AnimationContext, "useAnimation").mockReturnValue(
      mockAnimation as any,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render the playback controls", () => {
    render(<PlaybackMini />);
    expect(
      screen.getByRole("button", { name: /Lancer la lecture/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Arrêter la lecture/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Frame/i)).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should call setPlaying when play/pause button is clicked", () => {
    render(<PlaybackMini />);
    fireEvent.click(screen.getByRole("button", { name: /Lancer la lecture/i }));
    expect(mockAnimation.setPlaying).toHaveBeenCalled();
  });

  it("should call setPlaying and setCurrentFrame when stop button is clicked", () => {
    render(<PlaybackMini />);
    fireEvent.click(screen.getByRole("button", { name: /Arrêter la lecture/i }));
    expect(mockAnimation.setPlaying).toHaveBeenCalledWith(false);
    expect(mockAnimation.setCurrentFrame).toHaveBeenCalledWith(0);
  });
});
