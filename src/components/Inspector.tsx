import React, { useMemo, useCallback } from "react";
import { useUi } from "../context/UiContext";
import { FloatingPanel } from "./FloatingPanel";
import type { PuppetVariantGroupMetadata } from "./SvgPuppet";

export const Inspector: React.FC = React.memo(() => {
  const {
    selectedPuppet,
    selectedPuppetId,
    selectedLimb,
    limbIds,
    angle,
    setAngle,
    selectedPuppetMetadata,
    selectedVariantSelections,
    setVariantForSelected,
    sceneItems,
    selectPuppet,
  } = useUi();

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

  const allVariantGroups = useMemo<PuppetVariantGroupMetadata[]>(() => {
    return selectedPuppetMetadata?.variantGroups ?? [];
  }, [selectedPuppetMetadata]);

  const variantGroupsTouchingSelection = useMemo(() => {
    if (!selectedLimb || !selectedPuppetMetadata) return new Set<string>();
    const groups = new Set<string>();
    for (const group of selectedPuppetMetadata.variantGroups) {
      if (
        group.variants.some((variant) => {
          return (
            variant.targetMemberId === selectedLimb ||
            variant.memberId === selectedLimb ||
            variant.id === selectedLimb
          );
        })
      ) {
        groups.add(group.group);
      }
    }
    return groups;
  }, [selectedLimb, selectedPuppetMetadata]);

  const handleVariantChange = useCallback(
    (group: string, value: string) => {
      setVariantForSelected(group, value || null);
    },
    [setVariantForSelected],
  );

  const puppetItems = useMemo(
    () => sceneItems.filter((item) => item.type === "puppet"),
    [sceneItems],
  );

  const handlePuppetChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value || null;
      selectPuppet(value);
    },
    [selectPuppet],
  );

  return (
    <FloatingPanel
      title="Inspector"
      initialPosition={{ x: window.innerWidth - 320, y: 20 }}
      width={320}
      height={340}
      storageKey="pos:panel:inspector"
    >
      <div className="inspector-content">
        <div className="property-group">
          <h4>Selection</h4>
          <div className="property">
            <label>Pantin</label>
            <select value={selectedPuppetId ?? ""} onChange={handlePuppetChange}>
              <option value="">(aucun)</option>
              {puppetItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="property"><label>Limb</label><div>{selectedLimb || "(none)"}</div></div>
          <div className="property"><label>Pivot</label><div>{pivotStr}</div></div>
          <div className="property" style={{ gap: 8 }}>
            <button onClick={onCopy} disabled={!selectedLimb}>
              Copy id
            </button>
            <button onClick={handleResetAngle} disabled={!selectedLimb}>
              Reset angle
            </button>
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
        <div className="property-group">
          <h4>Variantes</h4>
          {!selectedPuppet && (
            <p className="inspector-hint">
              Sélectionnez un pantin dans la scène ou via la liste pour modifier ses variantes.
            </p>
          )}
          {selectedPuppet && allVariantGroups.length === 0 && (
            <p className="inspector-hint">Ce pantin n&apos;a pas de variantes déclarées.</p>
          )}
          {selectedPuppet && allVariantGroups.length > 0 && (
            <div className="variant-groups">
              {allVariantGroups.map((group) => {
                const current =
                  selectedVariantSelections[group.group] ?? group.defaultVariantId ?? "";
                const isRelevant = variantGroupsTouchingSelection.has(group.group);
                return (
                  <div
                    key={group.group}
                    className={`variant-group${isRelevant ? " variant-group--highlight" : ""}`}
                  >
                    <div className="variant-group__header">
                      <span>{group.group}</span>
                      {isRelevant && <span className="variant-group__tag">lié au membre sélectionné</span>}
                    </div>
                    <div className="variant-options">
                      {group.variants.map((variant) => {
                        const value =
                          variant.id ??
                          variant.memberId ??
                          variant.targetMemberId ??
                          variant.name ??
                          "";
                        const label = variant.name || value || "Défaut";
                        const active = current === value || (!current && variant.isDefault);
                        return (
                          <button
                            key={`${group.group}:${value}`}
                            className={`variant-option${active ? " is-active" : ""}`}
                            onClick={() => handleVariantChange(group.group, value)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="property-group">
          <h4>Aide</h4>
          <p className="inspector-hint">
            Astuce : cliquez sur un membre dans la scène pour lister ses variantes dédiées et régler son angle
            dans la timeline.
          </p>
        </div>
      </div>
    </FloatingPanel>
  );
});
