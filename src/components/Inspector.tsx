import React, { useMemo, useCallback } from "react";
import { useUi } from "../context/UiContext";
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
  } = useUi();

  const selectedItem = useMemo(
    () => sceneItems.find((item) => item.id === selectedItemId),
    [sceneItems, selectedItemId]
  );

  // Get position from element
  const position = useMemo(() => {
    if (!selectedItem) return { x: 0, y: 0 };
    const el = selectedItem.el;

    if (selectedItem.type === "puppet") {
      // Puppet anchor has transform="translate(x, y)"
      const transform = el.getAttribute("transform") || "";
      const match = transform.match(/translate\(([-\d.]+)[,\s]+([-\d.]+)\)/);
      if (match) {
        return { x: parseFloat(match[1] || "0"), y: parseFloat(match[2] || "0") };
      }
    } else {
      // Image has x and y attributes
      const x = parseFloat(el.getAttribute("x") || "0");
      const y = parseFloat(el.getAttribute("y") || "0");
      return { x, y };
    }
    return { x: 0, y: 0 };
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
    }));
  }, [selectedItem]);

  const handleSelectItem = useCallback(
    (id: string) => {
      setSelectedItemId(id);
      setSelectedLimb(""); // Clear limb selection when changing item
    },
    [setSelectedItemId, setSelectedLimb]
  );

  const handleDeleteItem = useCallback(() => {
    if (!selectedItemId) return;
    const item = sceneItems.find((i) => i.id === selectedItemId);
    if (item?.el.parentNode) {
      item.el.parentNode.removeChild(item.el);
    }
    removeSceneItem(selectedItemId);
    setSelectedItemId(null);
    setSelectedLimb("");
  }, [selectedItemId, sceneItems, removeSceneItem, setSelectedItemId, setSelectedLimb]);

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
            const transform = limbEl.style.transform || "";
            const match = transform.match(/rotate\(([-\d.]+)deg\)/);
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
      // Apply rotation to limb
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

  return (
    <FloatingPanel
      title="Inspector"
      initialPosition={{ x: window.innerWidth - 320, y: 20 }}
      width={300}
      height={500}
      storageKey="pos:panel:inspector"
    >
      <div className="inspector-content">
        {/* Scene Items List */}
        <div className="property-group">
          <h4>Scene Items ({sceneItems.length})</h4>
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
                <label>Label</label>
                <div>{selectedItem.label}</div>
              </div>
              <div className="property">
                <label>Position X</label>
                <div>{Math.round(position.x)}</div>
              </div>
              <div className="property">
                <label>Position Y</label>
                <div>{Math.round(position.y)}</div>
              </div>
              <div className="property">
                <button onClick={handleDeleteItem} style={{ width: "100%", padding: 8, background: "#ff6b6b", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer" }}>
                  Delete Item
                </button>
              </div>
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
                      }}
                    >
                      {limb.name}
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
                  <input
                    type="number"
                    value={Math.round(angle)}
                    onChange={(e) => handleAngleChange(parseFloat(e.target.value) || 0)}
                    style={{ width: 80 }}
                  />
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
