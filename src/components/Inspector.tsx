import React, { useMemo, useCallback } from "react";
import { useUi } from "../context/UiContext";
import { FloatingPanel } from "./FloatingPanel";

export const Inspector: React.FC = React.memo(() => {
  const { selectedPuppet, selectedLimb, limbIds, angle, setAngle } = useUi();

  const onCopy = useCallback(() => {
    if (selectedLimb) navigator.clipboard?.writeText(selectedLimb).catch(() => {});
  }, [selectedLimb]);

  const handleResetAngle = useCallback(() => {
    setAngle(0);
  }, [setAngle]);

  const pivotStr = useMemo(() => {
    if (!selectedPuppet || !selectedLimb) return "-";
    const g = selectedPuppet.querySelector(`#${CSS.escape(selectedLimb)}`) as SVGGElement | null;
    const p = g?.getAttribute("data-pivot");
    return p ?? "-";
  }, [selectedPuppet, selectedLimb]);

  return (
    <FloatingPanel title="Inspector" initialPosition={{ x: window.innerWidth - 320, y: 20 }} width={300} height={240} storageKey="pos:panel:inspector">
      <div className="inspector-content">
        <div className="property-group">
          <h4>Selection</h4>
          <div className="property"><label>Limb</label><div>{selectedLimb || "(none)"}</div></div>
          <div className="property"><label>Pivot</label><div>{pivotStr}</div></div>
          <div className="property" style={{ gap: 8 }}>
            <button onClick={onCopy}>Copy id</button>
            <button onClick={handleResetAngle}>Reset angle</button>
          </div>
        </div>
        <div className="property-group">
          <h4>Transform</h4>
          <div className="property"><label>Angle</label><div>{Math.round(angle)}°</div></div>
        </div>
        <div className="property-group">
          <h4>Stats</h4>
          <div className="property"><label>Total limbs</label><div>{limbIds.length}</div></div>
        </div>
      </div>
    </FloatingPanel>
  );
});
