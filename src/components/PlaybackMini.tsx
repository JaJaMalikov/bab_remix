import { memo, useCallback } from "react";

import { Button } from "./ui/button";
import { Icons } from "./ui/icons";
import { useAnimation } from "../context/AnimationContext";

export const PlaybackMini = memo(() => {
  const { playing, setPlaying, currentFrame, setCurrentFrame } = useAnimation();

  const handleTogglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, [setPlaying]);

  const handleStop = useCallback(() => {
    setPlaying(false);
    setCurrentFrame(0);
  }, [setPlaying, setCurrentFrame]);

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 px-4 py-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleTogglePlay}
          aria-label={playing ? "Mettre en pause" : "Lancer la lecture"}
        >
          {playing ? (
            <span className="flex items-center gap-2">
              <Icons.pause className="h-4 w-4" /> Pause
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Icons.play className="h-4 w-4" /> Play
            </span>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleStop}
          aria-label="Arrêter la lecture"
        >
          <Icons.stop className="mr-2 h-4 w-4" /> Stop
        </Button>
      </div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Frame <span className="ml-1 font-semibold text-foreground">{currentFrame}</span>
      </div>
    </div>
  );
});
