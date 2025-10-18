import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useUi } from "../context/UiContext";
import { useAnimation } from "../context/AnimationContext";
import { useTimelineData } from "../hooks/useTimelineData";
import { useVerticalResize } from "../hooks/useVerticalResize";
import { Icons } from "./ui/icons";

const MIN_HEIGHT = 56;
const MAX_HEIGHT = 180;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const extractClientX = (event: MouseEvent | TouchEvent): number | null => {
  if ("touches" in event) {
    const touch = event.touches[0] ?? event.changedTouches?.[0];
    return touch?.clientX ?? null;
  }
  return (event as MouseEvent).clientX ?? null;
};

export const Timeline: React.FC = React.memo(() => {
  const { timelineHeight, setTimelineHeight, sceneItems } = useUi();
  const {
    duration,
    currentFrame,
    setCurrentFrame,
    tracks,
    removeKeyframe,
    playing,
    setPlaying,
    snapshotKeyframes,
    addKeyframe,
    getValueAtFrame,
  } = useAnimation();

  const { onResizeMouseDown } = useVerticalResize({
    height: timelineHeight,
    setHeight: setTimelineHeight,
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
  });

  const laneRef = useRef<HTMLDivElement | null>(null);
  const rulerScrollRef = useRef<HTMLDivElement | null>(null);
  const layersScrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [zoom, setZoom] = useState(1);

  const maxFrameIndex = Math.max(duration - 1, 0);
  const frameDivisor = Math.max(maxFrameIndex, 1);
  const safeFrameDivisor = Math.max(frameDivisor, 1);

  const itemTrackData = useTimelineData(sceneItems, tracks, frameDivisor);

  useEffect(() => {
    if (timelineHeight > MAX_HEIGHT) {
      setTimelineHeight(MAX_HEIGHT);
    }
  }, [timelineHeight, setTimelineHeight]);

  const computeFrameFromClientX = useCallback(
    (clientX: number): number | null => {
      const rect = laneRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const relativeX = clamp(clientX - rect.left, 0, rect.width);
      const ratio = rect.width > 0 ? relativeX / rect.width : 0;
      const nextFrame = Math.round(ratio * frameDivisor);
      return clamp(nextFrame, 0, frameDivisor);
    },
    [frameDivisor],
  );

  const updateFrameFromClientX = useCallback(
    (clientX: number) => {
      const frame = computeFrameFromClientX(clientX);
      if (frame === null) return;
      setCurrentFrame(frame);
    },
    [computeFrameFromClientX, setCurrentFrame],
  );

  const startScrubbing = useCallback(
    (initialClientX: number) => {
      setIsScrubbing(true);
      updateFrameFromClientX(initialClientX);

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        const clientX = extractClientX(moveEvent);
        if (clientX != null) {
          updateFrameFromClientX(clientX);
        }
      };

      const stopScrubbing = () => {
        setIsScrubbing(false);
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("mouseup", stopScrubbing);
        window.removeEventListener("touchend", stopScrubbing);
        window.removeEventListener("touchcancel", stopScrubbing);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("mouseup", stopScrubbing);
      window.addEventListener("touchend", stopScrubbing);
      window.addEventListener("touchcancel", stopScrubbing);
    },
    [updateFrameFromClientX],
  );

  const handleLanePointerDown = useCallback(
    (
      event:
        | React.MouseEvent<HTMLDivElement>
        | React.TouchEvent<HTMLDivElement>,
    ) => {
      event.preventDefault();
      const initialClientX =
        "touches" in event
          ? (event.touches[0]?.clientX ?? null)
          : (event.clientX ?? null);
      if (initialClientX == null) return;
      startScrubbing(initialClientX);
    },
    [startScrubbing],
  );

  const toggleVisibilityAtFrame = useCallback(
    (itemId: string, frame: number) => {
      const currentValue = getValueAtFrame(itemId, null, "visible", frame);
      const nextValue = !(currentValue === null ? true : Boolean(currentValue));
      addKeyframe(itemId, null, "visible", frame, nextValue);
    },
    [addKeyframe, getValueAtFrame],
  );

  const handleVisibilityTrackPointerDown = useCallback(
    (
      itemId: string,
      event:
        | React.MouseEvent<HTMLDivElement>
        | React.TouchEvent<HTMLDivElement>,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      const clientX =
        "touches" in event
          ? (event.touches[0]?.clientX ?? null)
          : ((event as React.MouseEvent).clientX ?? null);
      if (clientX == null) return;
      const frame = computeFrameFromClientX(clientX);
      if (frame === null) return;
      setCurrentFrame(frame);
      toggleVisibilityAtFrame(itemId, frame);
    },
    [computeFrameFromClientX, setCurrentFrame, toggleVisibilityAtFrame],
  );

  const frameMarkers = useMemo(
    () =>
      Array.from(
        tracks.reduce((acc, track) => {
          track.keyframes.forEach((kf) => {
            acc.set(kf.frame, (acc.get(kf.frame) ?? 0) + 1);
          });
          return acc;
        }, new Map<number, number>()),
      )
        .sort((a, b) => a[0] - b[0])
        .map(([frame, count]) => ({ frame, count })),
    [tracks],
  );

  const currentFramePosition = useMemo(
    () => (currentFrame / safeFrameDivisor) * 100,
    [currentFrame, safeFrameDivisor],
  );

  const tickStep = useMemo(() => {
    if (frameDivisor > 720) return 60;
    if (frameDivisor > 360) return 30;
    if (frameDivisor > 240) return 24;
    if (frameDivisor > 120) return 12;
    if (frameDivisor > 60) return 8;
    if (frameDivisor > 30) return 4;
    return 1;
  }, [frameDivisor]);


  const handleTogglePlay = useCallback(() => {
    setPlaying(!playing);
  }, [playing, setPlaying]);

  const handleStop = useCallback(() => {
    setPlaying(false);
    setCurrentFrame(0);
  }, [setCurrentFrame, setPlaying]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.5, 1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const syncScroll = useCallback((sourceScrollLeft: number) => {
    if (rulerScrollRef.current) {
      rulerScrollRef.current.scrollLeft = sourceScrollLeft;
    }
    layersScrollRefs.current.forEach((el) => {
      if (el) el.scrollLeft = sourceScrollLeft;
    });
  }, []);

  const gotoFrame = useCallback(
    (frame: number) => {
      setCurrentFrame(clamp(frame, 0, frameDivisor));
    },
    [frameDivisor, setCurrentFrame],
  );

  const clearFrameKeyframes = useCallback(
    (frame: number) => {
      tracks.forEach((track) => {
        const hasKeyframe = track.keyframes.some((kf) => kf.frame === frame);
        if (hasKeyframe) {
          removeKeyframe(track.id, frame);
        }
      });
    },
    [removeKeyframe, tracks],
  );

  const showTrackRows = sceneItems.length > 0;
  const PlayPauseIcon = playing ? Icons.pause : Icons.play;
  const StopIcon = Icons.stop;
  const SnapshotIcon = Icons.camera;
  const ZoomInIcon = Icons.zoomIn;
  const ZoomOutIcon = Icons.zoomOut;
  const ZoomResetIcon = Icons.zoomReset;

  return (
    <div className="timeline" style={{ height: timelineHeight }}>
      <div
        className="timeline-resizer"
        onMouseDown={onResizeMouseDown}
        title="Redimensionner la timeline"
      />

      <div className="timeline-body">
        <div
          className="timeline-track-panel"
          aria-label="Barre d’outils de la timeline"
        >
          <div className="timeline-panel-section">
            <span className="timeline-panel-heading">Transport</span>
            <div
              className="timeline-controls"
              role="group"
              aria-label="Contrôles de lecture"
            >
              <button
                type="button"
                className="timeline-icon-button"
                title={playing ? "Mettre en pause" : "Lecture"}
                onClick={handleTogglePlay}
                data-state={playing ? "active" : undefined}
              >
                <PlayPauseIcon className="timeline-icon" aria-hidden />
                <span className="sr-only">
                  {playing ? "Mettre la lecture en pause" : "Lancer la lecture"}
                </span>
              </button>
              <button
                type="button"
                className="timeline-icon-button"
                title="Revenir au début"
                onClick={handleStop}
              >
                <StopIcon className="timeline-icon" aria-hidden />
                <span className="sr-only">Revenir au début</span>
              </button>
              <button
                type="button"
                className="timeline-icon-button"
                title="Snapshot des éléments à ce frame"
                onClick={() => snapshotKeyframes(sceneItems)}
              >
                <SnapshotIcon className="timeline-icon" aria-hidden />
                <span className="sr-only">
                  Capturer les keyframes des éléments visibles
                </span>
              </button>
            </div>
          </div>
          <div className="timeline-panel-section">
            <span className="timeline-panel-heading">Aperçu</span>
            <div
              className="timeline-info"
              role="group"
              aria-label="Informations temporelles"
            >
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
          <div className="timeline-panel-section">
            <span className="timeline-panel-heading">Zoom</span>
            <div
              className="timeline-zoom-controls"
              role="group"
              aria-label="Contrôles de zoom"
            >
              <button
                type="button"
                className="timeline-icon-button"
                title="Zoom avant"
                onClick={handleZoomIn}
                disabled={zoom >= 5}
              >
                <ZoomInIcon className="timeline-icon" aria-hidden />
                <span className="sr-only">Zoom avant</span>
              </button>
              <button
                type="button"
                className="timeline-icon-button"
                title="Zoom arrière"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
              >
                <ZoomOutIcon className="timeline-icon" aria-hidden />
                <span className="sr-only">Zoom arrière</span>
              </button>
              <button
                type="button"
                className="timeline-icon-button"
                title="Réinitialiser le zoom"
                onClick={handleResetZoom}
                disabled={zoom === 1}
                data-state={zoom !== 1 ? "active" : undefined}
              >
                <ZoomResetIcon className="timeline-icon" aria-hidden />
                <span className="sr-only">Réinitialiser le zoom</span>
              </button>
            </div>
          </div>
        </div>

        <div className="timeline-track-view">
          <div className="timeline-track-header">
            <div className="timeline-track-label timeline-track-label--header">
              Élément
            </div>
            <div
              ref={rulerScrollRef}
              className={`timeline-lane${isScrubbing ? " is-scrubbing" : ""}`}
              style={{ overflowX: zoom > 1 ? "auto" : "hidden" }}
              onScroll={(e) => syncScroll(e.currentTarget.scrollLeft)}
            >
              <div className="timeline-lane-background" />
              <div
                ref={laneRef}
                style={{ width: `${zoom * 100}%`, position: "relative", minHeight: "48px" }}
                onMouseDown={handleLanePointerDown}
                onTouchStart={handleLanePointerDown}
                role="presentation"
              >
                <div
                  className="timeline-playhead"
                  style={{ left: `${currentFramePosition}%` }}
                />
                {frameMarkers.map(({ frame, count }) => {
                const left = (frame / safeFrameDivisor) * 100;
                return (
                  <button
                    key={frame}
                    type="button"
                    className={`timeline-marker${frame === currentFrame ? " is-active" : ""}`}
                    style={{ left: `${left}%` }}
                    title={
                      count > 1
                        ? `${count} keyframes au frame ${frame}`
                        : `Keyframe au frame ${frame}`
                    }
                    onClick={() => gotoFrame(frame)}
                    onDoubleClick={() => clearFrameKeyframes(frame)}
                  >
                    <span className="timeline-marker-stem" />
                    <span className="timeline-marker-cap" />
                  </button>
                );
              })}
              {frameMarkers.length === 0 && (
                <div className="timeline-lane-empty">
                  Aucune keyframe pour l’instant.
                </div>
              )}
              <div className="timeline-lane-scale">
                {Array.from({ length: frameDivisor + 1 }, (_, index) => {
                  if (
                    index !== 0 &&
                    index !== frameDivisor &&
                    index % tickStep !== 0
                  ) {
                    return null;
                  }
                  const left = (index / safeFrameDivisor) * 100;
                  return (
                    <div
                      key={index}
                      className="timeline-lane-tick"
                      style={{ left: `${left}%` }}
                    >
                      <span className="timeline-lane-tick-line" />
                      <span className="timeline-lane-tick-label">{index}</span>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          </div>

          <div className="timeline-track-scroll">
            {!showTrackRows && (
              <div className="timeline-track-empty">
                Aucun élément dans la scène pour le moment.
              </div>
            )}

            {showTrackRows && (
              <div className="timeline-track-list">
                {itemTrackData.map((trackData) => {
                  const icon = trackData.type === "puppet" ? "🪆" : "🖼️";
                  return (
                    <div className="timeline-track-row" key={trackData.id}>
                      <div
                        className="timeline-track-label"
                        title={trackData.label}
                      >
                        <span className="timeline-track-label-icon" aria-hidden>
                          {icon}
                        </span>
                        <span className="timeline-track-label-text">
                          {trackData.label}
                        </span>
                      </div>
                      <div
                        ref={(el) => {
                          if (el) layersScrollRefs.current.set(trackData.id, el);
                          else layersScrollRefs.current.delete(trackData.id);
                        }}
                        className="timeline-track-layers"
                        style={{ overflowX: zoom > 1 ? "auto" : "hidden" }}
                        onScroll={(e) => syncScroll(e.currentTarget.scrollLeft)}
                      >
                        <div style={{ width: `${zoom * 100}%`, position: "relative" }}>
                          <div
                            className="timeline-track-playhead"
                            style={{ left: `${currentFramePosition}%` }}
                          />
                          <div
                            className="timeline-track-layer track-layer-visibility"
                            onMouseDown={(event) =>
                              handleVisibilityTrackPointerDown(
                                trackData.id,
                                event,
                              )
                            }
                            onTouchStart={(event) =>
                              handleVisibilityTrackPointerDown(
                                trackData.id,
                                event,
                              )
                            }
                            role="presentation"
                          >
                          {trackData.visibility.map((segment, index) => {
                            const start = clamp(
                              segment.start,
                              0,
                              frameDivisor,
                            );
                            const end = clamp(segment.end, 0, frameDivisor);
                            const leftPercent =
                              (start / safeFrameDivisor) * 100;
                            const span = Math.max(end - start, 1);
                            const widthPercent = Math.min(
                              (span / safeFrameDivisor) * 100,
                              100 - leftPercent,
                            );
                            return (
                              <div
                                key={index}
                                className={`timeline-track-segment${segment.visible ? " is-visible" : " is-hidden"}`}
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                }}
                              />
                            );
                          })}
                          {trackData.position.map((kf, index) => {
                            const leftPercent =
                              (kf.frame / safeFrameDivisor) * 100;
                            return (
                              <div
                                key={`${kf.axis}-${index}-${kf.frame}`}
                                className={`timeline-keyframe position-${kf.axis}`}
                                style={{ left: `${leftPercent}%` }}
                                title={`${kf.axis.toUpperCase()} • Frame ${kf.frame}`}
                              />
                            );
                          })}
                          {trackData.rotation.map((kf, index) => {
                            const leftPercent =
                              (kf.frame / safeFrameDivisor) * 100;
                            return (
                              <div
                                key={`${trackData.id}-rot-${index}-${kf.frame}`}
                                className="timeline-keyframe rotation"
                                style={{ left: `${leftPercent}%` }}
                                title={`Rotation • Frame ${kf.frame}`}
                              />
                            );
                          })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
