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
import { TimelineRuler } from "./TimelineRuler";
import { TimelineTrack } from "./TimelineTrack";
import { PlaybackControls } from "./PlaybackControls";

const MIN_HEIGHT = 44;
const MAX_HEIGHT = 180;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const Timeline: React.FC = React.memo(() => {
  const { timelineHeight, setTimelineHeight, sceneItems } = useUi();
  const {
    duration,
    currentFrame,
    setCurrentFrame,
    tracks,
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

  const rulerScrollRef = useRef<HTMLDivElement | null>(null);
  const tracksScrollRef = useRef<HTMLDivElement | null>(null);
  const timelineBodyRef = useRef<HTMLDivElement | null>(null);

  // Calculer le zoom par défaut pour remplir l'écran
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (timelineBodyRef.current) {
      // Soustraire la largeur du panneau de contrôle (~200px) et du label (~136px)
      const width = timelineBodyRef.current.offsetWidth - 200 - 150;
      setContainerWidth(width > 0 ? width : 800);
    }
  }, []);

  const defaultZoom = useMemo(() => {
    if (containerWidth > 0 && duration > 0) {
      const pixelsPerFrame = 2;
      const neededWidth = duration * pixelsPerFrame;
      if (neededWidth < containerWidth) {
        return containerWidth / neededWidth;
      }
    }
    return 1;
  }, [containerWidth, duration]);

  const [zoom, setZoom] = useState(defaultZoom);

  useEffect(() => {
    if (defaultZoom > 1 && zoom === 1) {
      setZoom(defaultZoom);
    }
  }, [defaultZoom, zoom]);

  const maxFrameIndex = Math.max(duration - 1, 0);
  const frameDivisor = Math.max(maxFrameIndex, 1);

  const itemTrackData = useTimelineData(sceneItems, tracks, frameDivisor);

  useEffect(() => {
    if (timelineHeight > MAX_HEIGHT) {
      setTimelineHeight(MAX_HEIGHT);
    }
  }, [timelineHeight, setTimelineHeight]);

  const toggleVisibilityAtFrame = useCallback(
    (itemId: string, frame: number) => {
      const currentValue = getValueAtFrame(itemId, null, "visible", frame);
      const nextValue = !(currentValue === null ? true : Boolean(currentValue));
      addKeyframe(itemId, null, "visible", frame, nextValue);
    },
    [addKeyframe, getValueAtFrame],
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

  const keyframeFrames = useMemo(
    () => frameMarkers.map((marker) => marker.frame),
    [frameMarkers],
  );

  const handleStop = useCallback(() => {
    setPlaying(false);
    setCurrentFrame(0);
  }, [setCurrentFrame, setPlaying]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.3, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.3, 1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const handlePrevKeyframe = useCallback(() => {
    if (keyframeFrames.length === 0) return;
    for (let index = keyframeFrames.length - 1; index >= 0; index -= 1) {
      const frame = keyframeFrames[index];
      if (frame < currentFrame) {
        setCurrentFrame(frame);
        return;
      }
    }
    setCurrentFrame(keyframeFrames[0] ?? 0);
  }, [currentFrame, keyframeFrames, setCurrentFrame]);

  const handleNextKeyframe = useCallback(() => {
    if (keyframeFrames.length === 0) return;
    for (let index = 0; index < keyframeFrames.length; index += 1) {
      const frame = keyframeFrames[index];
      if (frame > currentFrame) {
        setCurrentFrame(frame);
        return;
      }
    }
    setCurrentFrame(keyframeFrames[keyframeFrames.length - 1]);
  }, [currentFrame, keyframeFrames, setCurrentFrame]);

  const syncScroll = useCallback((sourceScrollLeft: number, source: 'ruler' | 'tracks') => {
    if (source === 'ruler' && tracksScrollRef.current) {
      tracksScrollRef.current.scrollLeft = sourceScrollLeft;
    } else if (source === 'tracks' && rulerScrollRef.current) {
      rulerScrollRef.current.scrollLeft = sourceScrollLeft;
    }
  }, []);

  const gotoFrame = useCallback(
    (frame: number) => {
      setCurrentFrame(clamp(frame, 0, frameDivisor));
    },
    [frameDivisor, setCurrentFrame],
  );

  const showTrackRows = sceneItems.length > 0;

  const hasPrevKeyframe = useMemo(
    () => keyframeFrames.some((frame) => frame < currentFrame),
    [keyframeFrames, currentFrame],
  );

  const hasNextKeyframe = useMemo(
    () => keyframeFrames.some((frame) => frame > currentFrame),
    [keyframeFrames, currentFrame],
  );

  const handleZoomChange = useCallback(
    (delta: number) => {
      if (delta > 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    },
    [handleZoomIn, handleZoomOut],
  );

  return (
    <div className="timeline" style={{ height: timelineHeight }}>
      <div
        className="timeline-resizer"
        onMouseDown={onResizeMouseDown}
        title="Redimensionner la timeline"
      />

      <div ref={timelineBodyRef} className="timeline-body">
        {/* Controls Panel */}
        <PlaybackControls
          isPlaying={playing}
          currentFrame={currentFrame}
          duration={duration}
          zoom={zoom}
          hasPrevKeyframe={hasPrevKeyframe}
          hasNextKeyframe={hasNextKeyframe}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onStop={handleStop}
          onPrevKeyframe={handlePrevKeyframe}
          onNextKeyframe={handleNextKeyframe}
          onSnapshot={() => snapshotKeyframes(sceneItems)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleResetZoom}
        />

        {/* Timeline View */}
        <div className="timeline-view">
          {/* Ruler */}
          <div
            ref={rulerScrollRef}
            className="timeline-ruler-scroll"
            onScroll={(e) => syncScroll(e.currentTarget.scrollLeft, 'ruler')}
          >
            <TimelineRuler
              duration={duration}
              currentFrame={currentFrame}
              zoom={zoom}
              onSeek={gotoFrame}
              onZoom={handleZoomChange}
            />
          </div>

          {/* Tracks */}
          <div className="timeline-tracks-scroll">
            {showTrackRows && (
              <div
                ref={tracksScrollRef}
                className="timeline-tracks-container"
                onScroll={(e) => syncScroll(e.currentTarget.scrollLeft, 'tracks')}
              >
                {itemTrackData.map((trackData) => {
                  // Prepare keyframes for the track
                  const keyframes = [
                    ...trackData.position.map((kf) => ({
                      frame: kf.frame,
                      type: "position" as const,
                      axis: kf.axis,
                      value: kf.value,
                    })),
                    ...trackData.rotation.map((kf) => ({
                      frame: kf.frame,
                      type: "rotation" as const,
                      value: kf.value,
                    })),
                  ];

                  return (
                    <TimelineTrack
                      key={trackData.id}
                      name={trackData.label}
                      type={trackData.type}
                      keyframes={keyframes}
                      visibilitySegments={trackData.visibility}
                      duration={duration}
                      zoom={zoom}
                      currentFrame={currentFrame}
                      onKeyframeClick={(kf) => gotoFrame(kf.frame)}
                      onVisibilityTrackClick={(frame) => {
                        setCurrentFrame(frame);
                        toggleVisibilityAtFrame(trackData.id, frame);
                      }}
                    />
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
