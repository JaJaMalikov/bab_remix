import { Icons } from "./ui/icons";

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentFrame: number;
  duration: number;
  zoom: number;
  hasPrevKeyframe: boolean;
  hasNextKeyframe: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrevKeyframe: () => void;
  onNextKeyframe: () => void;
  onSnapshot: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function PlaybackControls({
  isPlaying,
  currentFrame,
  duration,
  hasPrevKeyframe,
  hasNextKeyframe,
  onPlay,
  onPause,
  onStop,
  onPrevKeyframe,
  onNextKeyframe,
  onSnapshot,
}: PlaybackControlsProps) {
  const PlayPauseIcon = isPlaying ? Icons.pause : Icons.play;
  const StopIcon = Icons.stop;
  const SnapshotIcon = Icons.camera;
  const PrevKeyframeIcon = Icons.prevKeyframe;
  const NextKeyframeIcon = Icons.nextKeyframe;

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
        </div>
      </div>

      {/* Time display */}
      <div className="timeline-panel-section">
        <div className="timeline-info" role="group" aria-label="Informations temporelles">
          <div className="timeline-readout" title="Frame courante">
            <span className="timeline-readout-label">Frame</span>
            <span className="timeline-readout-value">{currentFrame}</span>
          </div>
          <div className="timeline-readout" title="Durée totale">
            <span className="timeline-readout-label">Durée</span>
            <span className="timeline-readout-value">{duration || 0}</span>
          </div>
        </div>
      </div>


    </div>
  );
}
