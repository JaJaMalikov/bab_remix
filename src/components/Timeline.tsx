import React, { useCallback, useMemo } from "react";
import { useUi } from "../context/UiContext";
import { useAnimation } from "../context/AnimationContext";
import { useVerticalResize } from "../hooks/useVerticalResize";

export const Timeline: React.FC = React.memo(() => {
  const { showTracks, setShowTracks, timelineHeight, setTimelineHeight, sceneItems } = useUi();
  const { duration, currentFrame, setCurrentFrame, tracks, removeKeyframe, playing, setPlaying, snapshotKeyframes } = useAnimation();

  // Use the custom hook for resizing logic
  const { onResizeMouseDown } = useVerticalResize({
    height: timelineHeight,
    setHeight: setTimelineHeight,
    maxHeight: Math.round(window.innerHeight * 0.6),
  });

  // Get tracks grouped by target
  const groupedTracks = useMemo(() => {
    const groups: Record<string, typeof tracks> = {};
    tracks.forEach((track) => {
      const key = `${track.targetId}:${track.targetMemberId || 'null'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(track);
    });
    return groups;
  }, [tracks]);

  // Get label for track target
  const getTargetLabel = useCallback(
    (targetId: string, memberId: string | null) => {
      const item = sceneItems.find((i) => i.id === targetId);
      if (!item) return "Unknown";
      if (!memberId) return item.label;
      // Get member name from DOM
      const anchor = item.el;
      const puppetRoot = anchor.firstChild as SVGGElement | null;
      if (puppetRoot) {
        const memberEl = puppetRoot.querySelector(`#${CSS.escape(memberId)}`) as SVGGElement | null;
        if (memberEl) {
          const memberName = memberEl.getAttribute("data-membre") || memberId;
          return `${item.label} › ${memberName}`;
        }
      }
      return `${item.label} › ${memberId}`;
    },
    [sceneItems]
  );

  // Memoized event handlers
  const handleTogglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  }, [playing, setPlaying]);

  const handleStop = useCallback(() => {
    setPlaying(false);
    setCurrentFrame(0);
  }, [setPlaying, setCurrentFrame]);

  const handleToggleTracks = useCallback(() => setShowTracks(!showTracks), [showTracks, setShowTracks]);

  const handleScrubberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentFrame(parseInt(e.target.value, 10));
    },
    [setCurrentFrame]
  );

  const handleKeyframeClick = useCallback(
    (trackId: string, frame: number) => {
      if (window.confirm(`Delete keyframe at frame ${frame}?`)) {
        removeKeyframe(trackId, frame);
      }
    },
    [removeKeyframe]
  );

  return (
    <div className="timeline" style={{ position: "relative", height: timelineHeight }}>
      <div className="timeline-resizer" onMouseDown={onResizeMouseDown} title="Drag to resize" />
      <div className="timeline-header">
        <div className="timeline-controls">
          <button onClick={handleTogglePlay}>{playing ? "⏸ Pause" : "▶ Play"}</button>
          <button onClick={handleStop}>⏹ Stop</button>
          <button
            onClick={() => snapshotKeyframes(sceneItems)}
            title="Snapshot all items in the scene to the current frame"
            style={{
              padding: "4px 8px",
              background: "#ff9800",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              marginLeft: 8,
            }}
          >
            Snapshot All
          </button>
          <span className="frame-counter">
            Frame: {currentFrame} / {duration}
          </span>
          <button style={{ marginLeft: "auto" }} onClick={handleToggleTracks}>
            {showTracks ? "Hide Tracks" : "Show Tracks"}
          </button>
        </div>
      </div>
      <div className="timeline-content">
        {showTracks && (
          <div className="timeline-tracks">
            {Object.entries(groupedTracks).map(([key, trackGroup]) => {
              const [targetId, memberId] = key.split(":");
              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "#b0b0b0", padding: "4px 8px", background: "#1e1e1e", borderRadius: 4 }}>
                    {getTargetLabel(targetId, memberId === "null" ? null : memberId)}
                  </div>
                  {trackGroup.map((track) => (
                    <div key={track.id} className="track">
                      <div className="track-label" style={{ fontSize: 11 }}>
                        {track.property}
                      </div>
                      <div className="track-keyframes" style={{ position: "relative" }}>
                        {track.keyframes.map((kf) => {
                          const left = (kf.frame / duration) * 100;
                          const valueStr = typeof kf.value === "number" ? kf.value.toFixed(2) : String(kf.value);
                          const title = [
                            `Frame: ${kf.frame}`,
                            `Value: ${valueStr}`,
                            kf.variant && `Variant: ${kf.variant}`,
                            kf.attachedObject && `Attached: ${kf.attachedObject.type} (${kf.attachedObject.id})`,
                          ].filter(Boolean).join("\n");

                          return (
                            <div
                              key={kf.frame}
                              onClick={() => handleKeyframeClick(track.id, kf.frame)}
                              style={{
                                position: "absolute",
                                left: `${left}%`,
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                width: 8,
                                height: 8,
                                background: kf.variant ? "#ff9800" : "#5a9fd4", // Orange for variant
                                borderRadius: "50%",
                                cursor: "pointer",
                                border: kf.attachedObject ? "2px solid #f44336" : "1px solid #fff", // Red border for attached object
                              }}
                              title={title}
                            />
                          );
                        })}
                        {/* Current frame indicator */}
                        <div
                          style={{
                            position: "absolute",
                            left: `${(currentFrame / duration) * 100}%`,
                            top: 0,
                            bottom: 0,
                            width: 2,
                            background: "#ff6b6b",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {tracks.length === 0 && (
              <div style={{ color: "#808080", fontSize: 12, padding: 16, textAlign: "center" }}>
                No animation tracks yet. Add keyframes from the Inspector.
              </div>
            )}
          </div>
        )}
        <div className="timeline-scrubber">
          <input
            type="range"
            min={0}
            max={duration - 1}
            value={currentFrame}
            onChange={handleScrubberChange}
            className="scrubber"
          />
        </div>
      </div>
    </div>
  );
});
