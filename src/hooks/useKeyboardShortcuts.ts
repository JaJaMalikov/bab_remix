import { useEffect } from "react";
import { useUi } from "../context/UiContext";
import { useAnimation } from "../context/AnimationContext";

export function useKeyboardShortcuts() {
  const { setShowLibrary, setShowInspector, setShowTimeline, fitInView } = useUi();

  const { setPlaying, setCurrentFrame, duration } = useAnimation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Ctrl/Cmd + shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "l":
            e.preventDefault();
            setShowLibrary((prev) => !prev);
            break;
          case "i":
            e.preventDefault();
            setShowInspector((prev) => !prev);
            break;
          case "g":
            e.preventDefault();
            setShowTimeline((prev) => !prev);
            break;
          case "0":
            e.preventDefault();
            fitInView?.();
            break;
        }
        return;
      }

      // Playback shortcuts
      switch (e.key) {
        case " ":
          e.preventDefault();
          setPlaying((prev) => !prev);
          break;
        case "ArrowRight":
          e.preventDefault();
          setCurrentFrame((prev) => Math.min(prev + 1, Math.max(duration - 1, 0)));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setCurrentFrame((prev) => Math.max(prev - 1, 0));
          break;
        case "Home":
          e.preventDefault();
          setCurrentFrame(0);
          break;
        case "End":
          e.preventDefault();
          setCurrentFrame(Math.max(duration - 1, 0));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setShowLibrary, setShowInspector, setShowTimeline, fitInView, setPlaying, setCurrentFrame, duration]);
}
