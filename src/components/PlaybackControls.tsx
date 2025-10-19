import { useEffect, useState } from "react";
import { Icons } from "./ui/icons";
import { useFpsCounter } from "../hooks/useFpsCounter";

interface PlaybackControlsProps {
  /** Indique si l'animation est en cours de lecture. */
  isPlaying: boolean;
  /** Indique si le mode recording est actif. */
  isRecording: boolean;
  /** La frame actuellement affichée dans la timeline. */
  currentFrame: number;
  /** La durée totale de l'animation en frames. */
  duration: number;
  /** La cadence d'image actuelle (images par seconde). */
  fps: number;
  /** Le niveau de zoom actuel de la timeline. */
  zoom: number;
  /** Indique s'il y a une keyframe avant la frame courante. */
  hasPrevKeyframe: boolean;
  /** Indique s'il y a une keyframe après la frame courante. */
  hasNextKeyframe: boolean;
  /** Callback pour démarrer la lecture. */
  onPlay: () => void;
  /** Callback pour mettre la lecture en pause. */
  onPause: () => void;
  /** Callback pour arrêter la lecture et revenir au début. */
  onStop: () => void;
  /** Callback pour toggle le mode recording. */
  onToggleRecording: () => void;
  /** Callback pour sauter à la keyframe précédente. */
  onPrevKeyframe: () => void;
  /** Callback pour sauter à la keyframe suivante. */
  onNextKeyframe: () => void;
  /** Callback pour créer un snapshot de l'état actuel. */
  onSnapshot: () => void;
  /** Callback pour zoomer dans la timeline. */
  onZoomIn: () => void;
  /** Callback pour dézoomer dans la timeline. */
  onZoomOut: () => void;
  /** Callback pour réinitialiser le niveau de zoom. */
  onZoomReset: () => void;
  /** Callback pour modifier la durée totale. */
  onDurationChange: (duration: number) => void;
  /** Callback pour modifier la cadence d'image. */
  onFpsChange: (fps: number) => void;
}

export function PlaybackControls({
  isPlaying,
  isRecording,
  currentFrame,
  duration,
  fps,
  hasPrevKeyframe,
  hasNextKeyframe,
  onPlay,
  onPause,
  onStop,
  onToggleRecording,
  onPrevKeyframe,
  onNextKeyframe,
  onSnapshot,
  onDurationChange,
  onFpsChange,
}: PlaybackControlsProps) {
  const PlayPauseIcon = isPlaying ? Icons.pause : Icons.play;
  const StopIcon = Icons.stop;
  const SnapshotIcon = Icons.camera;
  const PrevKeyframeIcon = Icons.prevKeyframe;
  const NextKeyframeIcon = Icons.nextKeyframe;
  const [durationDraft, setDurationDraft] = useState(() => duration.toString());
  const [fpsDraft, setFpsDraft] = useState(() => fps.toString());

  // FPS counter for performance monitoring
  const actualFps = useFpsCounter(isPlaying);

  useEffect(() => {
    setDurationDraft(duration.toString());
  }, [duration]);

  useEffect(() => {
    setFpsDraft(fps.toString());
  }, [fps]);

  const commitDuration = (raw: string) => {
    if (raw.trim() === "") {
      setDurationDraft(duration.toString());
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onDurationChange(parsed);
  };

  const commitFps = (raw: string) => {
    if (raw.trim() === "") {
      setFpsDraft(fps.toString());
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onFpsChange(parsed);
  };

  const durationSeconds =
    fps > 0 && Number.isFinite(duration / fps) ? duration / fps : 0;
  const formattedSeconds = durationSeconds.toFixed(2);

  return (
    <div className="timeline-controls-panel">
      {/* Playback controls */}
      <div className="timeline-panel-section">
        <div className="timeline-controls" role="group" aria-label="Contrôles de lecture">
          <button
            type="button"
            className="timeline-icon-button"
            title={isPlaying ? "Mettre en pause" : "Lecture"}
            onClick={isPlaying ? onPause : onPlay}
            data-state={isPlaying ? "active" : undefined}
            disabled={isRecording}
          >
            <PlayPauseIcon className="timeline-icon" aria-hidden />
            <span className="sr-only">
              {isPlaying ? "Mettre la lecture en pause" : "Lancer la lecture"}
            </span>
          </button>
          <button
            type="button"
            className="timeline-icon-button"
            title="Revenir au début"
            onClick={onStop}
          >
            <StopIcon className="timeline-icon" aria-hidden />
            <span className="sr-only">Revenir au début</span>
          </button>
          <button
            type="button"
            className="timeline-icon-button"
            title="Keyframe précédente"
            onClick={onPrevKeyframe}
            disabled={!hasPrevKeyframe}
          >
            <PrevKeyframeIcon className="timeline-icon" aria-hidden />
            <span className="sr-only">Aller à la keyframe précédente</span>
          </button>
          <button
            type="button"
            className="timeline-icon-button"
            title="Keyframe suivante"
            onClick={onNextKeyframe}
            disabled={!hasNextKeyframe}
          >
            <NextKeyframeIcon className="timeline-icon" aria-hidden />
            <span className="sr-only">Aller à la keyframe suivante</span>
          </button>
          <button
            type="button"
            className="timeline-icon-button"
            title="Snapshot des éléments à ce frame"
            onClick={onSnapshot}
          >
            <SnapshotIcon className="timeline-icon" aria-hidden />
            <span className="sr-only">Capturer les keyframes des éléments visibles</span>
          </button>
          <button
            type="button"
            className="timeline-icon-button"
            title={isRecording ? "Mode Recording actif - Cliquer pour désactiver" : "Activer le mode Recording"}
            onClick={onToggleRecording}
            data-state={isRecording ? "active" : undefined}
            style={{
              color: isRecording ? '#ef4444' : undefined,
              fontWeight: isRecording ? 'bold' : undefined
            }}
          >
            <span className="timeline-icon" aria-hidden>⏺</span>
            <span className="sr-only">{isRecording ? "Désactiver" : "Activer"} le mode recording</span>
          </button>
        </div>
      </div>

      {/* Time display */}
      <div className="timeline-panel-section">
        <div className="timeline-info" role="group" aria-label="Informations temporelles">
          <div className="timeline-readout" title="Frame courante">
            <span className="timeline-readout-label">Frame</span>
            <span className="timeline-readout-value">{currentFrame}</span>
          </div>
          <label
            className="timeline-readout"
            title="Durée totale (frames)"
            htmlFor="timeline-duration-input"
          >
            <span className="timeline-readout-label">Durée</span>
            <input
              id="timeline-duration-input"
              type="number"
              min={1}
              step={1}
              value={durationDraft}
              onChange={(event) => { setDurationDraft(event.currentTarget.value); }}
              onBlur={() => { commitDuration(durationDraft); }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitDuration(durationDraft);
                  (event.currentTarget as HTMLInputElement).blur();
                }
                if (event.key === "Escape") {
                  setDurationDraft(duration.toString());
                  (event.currentTarget as HTMLInputElement).blur();
                }
              }}
              inputMode="numeric"
              aria-label="Durée totale de l'animation en frames"
              className="timeline-readout-field no-scrollbar"
            />
          </label>
          <div className="timeline-readout" title="Durée totale (secondes)">
            <span className="timeline-readout-label">Secondes</span>
            <span className="timeline-readout-value">{formattedSeconds}</span>
          </div>
          <label
            className="timeline-readout"
            title="Images par seconde"
            htmlFor="timeline-fps-input"
          >
            <span className="timeline-readout-label">FPS</span>
            <input
              id="timeline-fps-input"
              type="number"
              min={1}
              step={1}
              value={fpsDraft}
              onChange={(event) => { setFpsDraft(event.currentTarget.value); }}
              onBlur={() => { commitFps(fpsDraft); }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitFps(fpsDraft);
                  (event.currentTarget as HTMLInputElement).blur();
                }
                if (event.key === "Escape") {
                  setFpsDraft(fps.toString());
                  (event.currentTarget as HTMLInputElement).blur();
                }
              }}
              inputMode="numeric"
              aria-label="Cadence d'image (images par seconde)"
              className="timeline-readout-field no-scrollbar"
            />
          </label>
          {isPlaying && actualFps > 0 && (
            <div
              className="timeline-readout"
              title="FPS réel pendant la lecture (performance)"
              style={{
                color: actualFps < fps * 0.9 ? '#ef4444' : actualFps >= fps * 0.95 ? '#22c55e' : '#f59e0b'
              }}
            >
              <span className="timeline-readout-label">Réel</span>
              <span className="timeline-readout-value">{actualFps}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
