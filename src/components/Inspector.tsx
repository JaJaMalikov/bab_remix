import React from "react";
import { useUi } from "../context/UiContext";

export const Inspector: React.FC = () => {
  const { selectedPuppet, selectedLimb, limbIds, angle, setAngle } = useUi();

  const onCopy = () => {
    if (selectedLimb) navigator.clipboard?.writeText(selectedLimb).catch(() => {});
  };

  const pivotStr = (() => {
    if (!selectedPuppet || !selectedLimb) return "-";
    const g = selectedPuppet.querySelector(`#${CSS.escape(selectedLimb)}`) as SVGGElement | null;
    const p = g?.getAttribute("data-pivot");
    return p ?? "-";
  })();

  return (
    <div
      style={{
        position: "absolute",
        right: 10,
        top: 10,
        zIndex: 10,
        background: "#111a",
        border: "1px solid #444",
        padding: 8,
        borderRadius: 6,
        color: "#eee",
        font: "12px system-ui",
        minWidth: 220,
      }}
    >
      <div style={{ marginBottom: 6, fontWeight: 600 }}>Inspector</div>
      <div>Limb: {selectedLimb || "(none)"}</div>
      <div>Pivot: {pivotStr}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={onCopy}>Copy id</button>
        <button onClick={() => setAngle(0)}>Reset angle</button>
      </div>
      <div style={{ marginTop: 6 }}>Total limbs: {limbIds.length}</div>
      <div style={{ marginTop: 6 }}>Angle: {Math.round(angle)}°</div>
    </div>
  );
};

