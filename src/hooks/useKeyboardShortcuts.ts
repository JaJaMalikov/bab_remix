import { useEffect } from 'react';
import { useUi } from '../context/UiContext';
import { useAnimation } from '../context/AnimationContext';

export function useKeyboardShortcuts() {
  const {
    showLibrary,
    setShowLibrary,
    showInspector,
    setShowInspector,
    showTimeline,
    setShowTimeline,
    fitInView,
  } = useUi();

  const { playing, setPlaying, currentFrame, setCurrentFrame, duration } = useAnimation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ctrl/Cmd + shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'l':
            e.preventDefault();
            setShowLibrary(!showLibrary);
            break;
          case 'i':
            e.preventDefault();
            setShowInspector(!showInspector);
            break;
          case 'g':
            e.preventDefault();
            setShowTimeline(!showTimeline);
            break;
          case '0':
            e.preventDefault();
            fitInView?.();
            break;
        }
        return;
      }

      // Playback shortcuts
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setPlaying(!playing);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentFrame < duration - 1) {
            setCurrentFrame(currentFrame + 1);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentFrame > 0) {
            setCurrentFrame(currentFrame - 1);
          }
          break;
        case 'Home':
          e.preventDefault();
          setCurrentFrame(0);
          break;
        case 'End':
          e.preventDefault();
          setCurrentFrame(duration - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showLibrary,
    setShowLibrary,
    showInspector,
    setShowInspector,
    showTimeline,
    setShowTimeline,
    fitInView,
    playing,
    setPlaying,
    currentFrame,
    setCurrentFrame,
    duration,
  ]);
}
