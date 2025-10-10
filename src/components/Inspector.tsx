import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useUi } from "../context/UiContext";
import { useAnimation, AnimationProperty } from "../context/AnimationContext";
import { FloatingPanel } from "./FloatingPanel";

export const Inspector: React.FC = React.memo(() => {
  const {
    sceneItems,
    selectedItemId,
    setSelectedItemId,
    selectedLimb,
    setSelectedLimb,
    angle,
    setAngle,
    removeSceneItem,
    updateSceneItemLabel,
  } = useUi();

  const { currentFrame, addKeyframe, getTrack, removeAllTracksForTarget } = useAnimation();

  const selectedItem = useMemo(
    () => sceneItems.find((item) => item.id === selectedItemId),
    [sceneItems, selectedItemId]
  );

  const [editingLabel, setEditingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState("");

  // Live transform state
  const [transform, setTransform] = useState({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });

  // Read transform from DOM whenever selectedItem changes
  useEffect(() => {
    if (!selectedItem) return;
    const el = selectedItem.el;

    if (selectedItem.type === "puppet") {
      const transformAttr = el.getAttribute("transform") || "";
      const match = transformAttr.match(/translate\(([-\d.]+)[,\s]+([-\d.]+)\)/);
      if (match) {
        setTransform({ x: parseFloat(match[1] || "0"), y: parseFloat(match[2] || "0"), rotation: 0, scaleX: 1, scaleY: 1 });
      }
    } else {
      const x = parseFloat(el.getAttribute("x") || "0");
      const y = parseFloat(el.getAttribute("y") || "0");
      const transformAttr = el.getAttribute("transform") || "";

      // Parse rotation and scale from transform
      const rotMatch = transformAttr.match(/rotate\(([-\d.]+)/);
      const scaleMatch = transformAttr.match(/scale\(([-\d.]+)(?:[,\s]+([-\d.]+))?\)/);

      const rotation = rotMatch ? parseFloat(rotMatch[1] || "0") : 0;
      const scaleX = scaleMatch ? parseFloat(scaleMatch[1] || "1") : 1;
      const scaleY = scaleMatch && scaleMatch[2] ? parseFloat(scaleMatch[2]) : scaleX;

      setTransform({ x, y, rotation, scaleX, scaleY });
    }
  }, [selectedItem]);

  // Get limb list for selected puppet
  const limbList = useMemo(() => {
    if (!selectedItem || selectedItem.type !== "puppet") return [];
    const anchor = selectedItem.el;
    const puppetRoot = anchor.firstChild as SVGGElement | null;
    if (!puppetRoot) return [];

    const limbs = puppetRoot.querySelectorAll("[data-membre]");
    return Array.from(limbs).map((limb) => ({
      id: limb.id,
      name: limb.getAttribute("data-membre") || limb.id,
      side: limb.getAttribute("data-side") || null,
    }));
  }, [selectedItem]);

  const handleSelectItem = useCallback(
    (id: string) => {
      setSelectedItemId(id);
      setSelectedLimb("");
    },
    [setSelectedItemId, setSelectedLimb]
  );

  const handleDeselectAll = useCallback(() => {
    setSelectedItemId(null);
    setSelectedLimb("");
  }, [setSelectedItemId, setSelectedLimb]);

  const handleDeleteItem = useCallback(() => {
    if (!selectedItemId) return;
    const item = sceneItems.find((i) => i.id === selectedItemId);
    if (item?.el.parentNode) {
      item.el.parentNode.removeChild(item.el);
    }
    removeSceneItem(selectedItemId);
    removeAllTracksForTarget(selectedItemId); // Remove animation tracks
    setSelectedItemId(null);
    setSelectedLimb("");
  }, [selectedItemId, sceneItems, removeSceneItem, removeAllTracksForTarget, setSelectedItemId, setSelectedLimb]);

  const handleStartEditLabel = useCallback(() => {
    if (selectedItem) {
      setLabelInput(selectedItem.label);
      setEditingLabel(true);
    }
  }, [selectedItem]);

  const handleSaveLabel = useCallback(() => {
    if (selectedItemId && labelInput.trim()) {
      updateSceneItemLabel(selectedItemId, labelInput.trim());
    }
    setEditingLabel(false);
  }, [selectedItemId, labelInput, updateSceneItemLabel]);

  const handleSelectLimb = useCallback(
    (limbId: string) => {
      setSelectedLimb(limbId);
      // Get current rotation from DOM
      if (selectedItem?.type === "puppet") {
        const anchor = selectedItem.el;
        const puppetRoot = anchor.firstChild as SVGGElement | null;
        if (puppetRoot) {
          const limbEl = puppetRoot.querySelector(`#${CSS.escape(limbId)}`) as SVGGElement | null;
          if (limbEl) {
            const transformStyle = limbEl.style.transform || "";
            const match = transformStyle.match(/rotate\(([-\d.]+)deg\)/);
            if (match) {
              setAngle(parseFloat(match[1] || "0"));
            } else {
              setAngle(0);
            }
          }
        }
      }
    },
    [setSelectedLimb, selectedItem, setAngle]
  );

  const handleAngleChange = useCallback(
    (newAngle: number) => {
      setAngle(newAngle);
      if (selectedLimb && selectedItem?.type === "puppet") {
        const anchor = selectedItem.el;
        const puppetRoot = anchor.firstChild as SVGGElement | null;
        if (puppetRoot) {
          const limbEl = puppetRoot.querySelector(`#${CSS.escape(selectedLimb)}`) as SVGGElement | null;
          if (limbEl) {
            limbEl.style.transform = `rotate(${newAngle}deg)`;
          }
        }
      }
    },
    [setAngle, selectedLimb, selectedItem]
  );

  // Add keyframe handler
  const handleAddKeyframe = useCallback(
    (property: AnimationProperty, value: number) => {
      if (!selectedItemId) return;
      const targetMemberId = selectedLimb || null;
      addKeyframe(selectedItemId, targetMemberId, property, currentFrame, value);
    },
    [selectedItemId, selectedLimb, currentFrame, addKeyframe]
  );

  // Check if property has keyframe at current frame
  const hasKeyframe = useCallback(
    (property: AnimationProperty): boolean => {
      if (!selectedItemId) return false;
      const targetMemberId = selectedLimb || null;
      const track = getTrack(selectedItemId, targetMemberId, property);
      return track?.keyframes.some((kf) => kf.frame === currentFrame) || false;
    },
    [selectedItemId, selectedLimb, currentFrame, getTrack]
  );

  // Handle position change
  const handlePositionChange = useCallback(
    (axis: 'x' | 'y', value: number) => {
      if (!selectedItem) return;
      const newTransform = { ...transform, [axis]: value };
      setTransform(newTransform);

      const el = selectedItem.el;
      if (selectedItem.type === "puppet") {
        el.setAttribute("transform", `translate(${newTransform.x}, ${newTransform.y})`);
      } else {
        el.setAttribute(axis, String(value));
      }
    },
    [selectedItem, transform]
  );

  // Handle rotation change for images
  const handleRotationChange = useCallback(
    (value: number) => {
      if (!selectedItem || selectedItem.type !== "image") return;
      const newTransform = { ...transform, rotation: value };
      setTransform(newTransform);

      const el = selectedItem.el;
      const x = parseFloat(el.getAttribute("x") || "0");
      const y = parseFloat(el.getAttribute("y") || "0");
      const w = parseFloat(el.getAttribute("width") || "0");
      const h = parseFloat(el.getAttribute("height") || "0");
      const cx = x + w / 2;
      const cy = y + h / 2;

      el.setAttribute(
        "transform",
        `rotate(${value} ${cx} ${cy}) scale(${newTransform.scaleX} ${newTransform.scaleY})`
      );
    },
    [selectedItem, transform]
  );

  // Handle scale change for images
  const handleScaleChange = useCallback(
    (axis: 'scaleX' | 'scaleY', value: number) => {
      if (!selectedItem || selectedItem.type !== "image") return;
      const newTransform = { ...transform, [axis]: value };
      setTransform(newTransform);

      const el = selectedItem.el;
      const x = parseFloat(el.getAttribute("x") || "0");
      const y = parseFloat(el.getAttribute("y") || "0");
      const w = parseFloat(el.getAttribute("width") || "0");
      const h = parseFloat(el.getAttribute("height") || "0");
      const cx = x + w / 2;
      const cy = y + h / 2;

      el.setAttribute(
        "transform",
        `rotate(${newTransform.rotation} ${cx} ${cy}) scale(${newTransform.scaleX} ${newTransform.scaleY})`
      );
    },
    [selectedItem, transform]
  );

  return (
    <FloatingPanel
      title="Inspector"
      initialPosition={{ x: window.innerWidth - 320, y: 20 }}
      width={300}
      height={600}
      storageKey="pos:panel:inspector"
    >
      <div className="inspector-content">
        {/* Scene Items List */}
        <div className="property-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>Scene Items ({sceneItems.length})</h4>
            {selectedItemId && (
              <button
                onClick={handleDeselectAll}
                style={{
                  padding: "4px 8px",
                  background: "#3a3a3a",
                  border: "1px solid #5a5a5a",
                  borderRadius: 4,
                  color: "#e0e0e0",
                  cursor: "pointer",
                  fontSize: 10,
                }}
              >
                Deselect
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto" }}>
            {sceneItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item.id)}
                style={{
                  padding: "6px 8px",
                  background: item.id === selectedItemId ? "#5a9fd4" : "#1e1e1e",
                  border: "1px solid #3a3a3a",
                  borderRadius: 4,
                  color: item.id === selectedItemId ? "#fff" : "#e0e0e0",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 12,
                }}
              >
                {item.type === "puppet" ? "🎭" : "🖼️"} {item.label}
              </button>
            ))}
            {sceneItems.length === 0 && (
              <div style={{ color: "#808080", fontSize: 12, padding: 8 }}>No items in scene</div>
            )}
          </div>
        </div>

        {/* Selected Item Properties */}
        {selectedItem && (
          <>
            <div className="property-group">
              <h4>Properties</h4>
              <div className="property">
                <label>Type</label>
                <div>{selectedItem.type === "puppet" ? "Puppet" : "Image"}</div>
              </div>
              <div className="property">
                <label>Name</label>
                {editingLabel ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <input
                      type="text"
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveLabel()}
                      autoFocus
                      style={{ flex: 1, padding: "4px 6px", fontSize: 11 }}
                    />
                    <button onClick={handleSaveLabel} style={{ padding: "4px 8px", fontSize: 10 }}>✓</button>
                  </div>
                ) : (
                  <div
                    onClick={handleStartEditLabel}
                    style={{ cursor: "pointer", textDecoration: "underline dotted" }}
                  >
                    {selectedItem.label}
                  </div>
                )}
              </div>
            </div>

            {/* Transform */}
            <div className="property-group">
              <h4>Transform</h4>
              <div className="property">
                <label>Position X</label>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    type="number"
                    value={Math.round(transform.x)}
                    onChange={(e) => handlePositionChange('x', parseFloat(e.target.value) || 0)}
                    style={{ width: 80 }}
                  />
                  <button
                    onClick={() => handleAddKeyframe('x', transform.x)}
                    title="Add keyframe"
                    style={{
                      padding: "4px 8px",
                      background: hasKeyframe('x') ? "#5a9fd4" : "#3a3a3a",
                      border: "none",
                      borderRadius: 4,
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    ◆
                  </button>
                </div>
              </div>
              <div className="property">
                <label>Position Y</label>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    type="number"
                    value={Math.round(transform.y)}
                    onChange={(e) => handlePositionChange('y', parseFloat(e.target.value) || 0)}
                    style={{ width: 80 }}
                  />
                  <button
                    onClick={() => handleAddKeyframe('y', transform.y)}
                    title="Add keyframe"
                    style={{
                      padding: "4px 8px",
                      background: hasKeyframe('y') ? "#5a9fd4" : "#3a3a3a",
                      border: "none",
                      borderRadius: 4,
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    ◆
                  </button>
                </div>
              </div>

              {/* Rotation and Scale for Images only */}
              {selectedItem.type === "image" && (
                <>
                  <div className="property">
                    <label>Rotation</label>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input
                        type="number"
                        value={Math.round(transform.rotation)}
                        onChange={(e) => handleRotationChange(parseFloat(e.target.value) || 0)}
                        style={{ width: 80 }}
                      />
                      <button
                        onClick={() => handleAddKeyframe('rotation', transform.rotation)}
                        title="Add keyframe"
                        style={{
                          padding: "4px 8px",
                          background: hasKeyframe('rotation') ? "#5a9fd4" : "#3a3a3a",
                          border: "none",
                          borderRadius: 4,
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        ◆
                      </button>
                    </div>
                  </div>
                  <div className="property">
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={transform.rotation}
                      onChange={(e) => handleRotationChange(parseFloat(e.target.value))}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div className="property">
                    <label>Scale X</label>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input
                        type="number"
                        step="0.1"
                        value={transform.scaleX.toFixed(2)}
                        onChange={(e) => handleScaleChange('scaleX', parseFloat(e.target.value) || 1)}
                        style={{ width: 80 }}
                      />
                      <button
                        onClick={() => handleAddKeyframe('scaleX', transform.scaleX)}
                        title="Add keyframe"
                        style={{
                          padding: "4px 8px",
                          background: hasKeyframe('scaleX') ? "#5a9fd4" : "#3a3a3a",
                          border: "none",
                          borderRadius: 4,
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        ◆
                      </button>
                    </div>
                  </div>
                  <div className="property">
                    <label>Scale Y</label>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input
                        type="number"
                        step="0.1"
                        value={transform.scaleY.toFixed(2)}
                        onChange={(e) => handleScaleChange('scaleY', parseFloat(e.target.value) || 1)}
                        style={{ width: 80 }}
                      />
                      <button
                        onClick={() => handleAddKeyframe('scaleY', transform.scaleY)}
                        title="Add keyframe"
                        style={{
                          padding: "4px 8px",
                          background: hasKeyframe('scaleY') ? "#5a9fd4" : "#3a3a3a",
                          border: "none",
                          borderRadius: 4,
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        ◆
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Delete Button */}
            <div className="property-group">
              <button
                onClick={handleDeleteItem}
                style={{
                  width: "100%",
                  padding: 8,
                  background: "#ff6b6b",
                  border: "none",
                  borderRadius: 4,
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Delete Item
              </button>
            </div>

            {/* Puppet Members */}
            {selectedItem.type === "puppet" && (
              <div className="property-group">
                <h4>Members ({limbList.length})</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 150, overflowY: "auto" }}>
                  {limbList.map((limb) => (
                    <button
                      key={limb.id}
                      onClick={() => handleSelectLimb(limb.id)}
                      style={{
                        padding: "6px 8px",
                        background: limb.id === selectedLimb ? "#5a9fd4" : "#1e1e1e",
                        border: "1px solid #3a3a3a",
                        borderRadius: 4,
                        color: limb.id === selectedLimb ? "#fff" : "#e0e0e0",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 11,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{limb.name}</span>
                      {limb.side && <span style={{ opacity: 0.6, fontSize: 10 }}>({limb.side})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Limb Transform */}
            {selectedLimb && selectedItem.type === "puppet" && (
              <div className="property-group">
                <h4>Member Transform</h4>
                <div className="property">
                  <label>Rotation</label>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input
                      type="number"
                      value={Math.round(angle)}
                      onChange={(e) => handleAngleChange(parseFloat(e.target.value) || 0)}
                      style={{ width: 80 }}
                    />
                    <button
                      onClick={() => handleAddKeyframe('rotation', angle)}
                      title="Add keyframe"
                      style={{
                        padding: "4px 8px",
                        background: hasKeyframe('rotation') ? "#5a9fd4" : "#3a3a3a",
                        border: "none",
                        borderRadius: 4,
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      ◆
                    </button>
                  </div>
                </div>
                <div className="property">
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={angle}
                    onChange={(e) => handleAngleChange(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {!selectedItem && (
          <div style={{ color: "#808080", fontSize: 12, padding: 16, textAlign: "center" }}>
            Select an item from the list above
          </div>
        )}
      </div>
    </FloatingPanel>
  );
});
