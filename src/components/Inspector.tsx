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
  const [transformRefresh, setTransformRefresh] = useState(0);

  // Active variants per puppet (keyed by puppetId:groupName)
  const [activeVariants, setActiveVariants] = useState<Record<string, string>>({});

  // Listen for drag/transform updates
  useEffect(() => {
    const handleTransformUpdate = () => setTransformRefresh(prev => prev + 1);
    window.addEventListener("item:transformed", handleTransformUpdate);
    return () => window.removeEventListener("item:transformed", handleTransformUpdate);
  }, []);

  // Initialize default variants when selecting a puppet
  useEffect(() => {
    if (!selectedItem || selectedItem.type !== "puppet" || !selectedItem.metadata) return;

    const anchor = selectedItem.el;
    const puppetRoot = anchor.firstChild as SVGGElement | null;
    if (!puppetRoot) return;

    selectedItem.metadata.variantGroups.forEach(group => {
      const key = `${selectedItem.id}:${group.group}`;

      // If no variant is set for this group, set the default
      if (!activeVariants[key]) {
        const defaultId = group.defaultVariantId || group.variants.find(v => v.isDefault)?.id || group.variants[0]?.id;
        if (defaultId) {
          setActiveVariants(prev => ({ ...prev, [key]: defaultId }));

          // Hide all except default
          group.variants.forEach(variant => {
            const el = puppetRoot.querySelector(`#${CSS.escape(variant.id)}`) as SVGElement | null;
            if (el) {
              if (variant.id === defaultId) {
                el.style.display = '';
                el.removeAttribute('display');
                // Show parent containers
                let parent = el.parentElement;
                while (parent && parent !== puppetRoot) {
                  if (parent.hasAttribute('display')) {
                    parent.removeAttribute('display');
                    parent.style.display = '';
                  }
                  parent = parent.parentElement as SVGElement | null;
                }
              } else {
                el.style.display = 'none';
              }
            }
          });
        }
      }
    });
  }, [selectedItem, activeVariants]);

  // Read transform from DOM whenever selectedItem, currentFrame, or drag updates
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
  }, [selectedItem, currentFrame, transformRefresh]);

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

  // Get current variant for a group
  const getCurrentVariant = useCallback(
    (groupName: string): string | null => {
      if (!selectedItem) return null;
      const key = `${selectedItem.id}:${groupName}`;
      return activeVariants[key] || null;
    },
    [selectedItem, activeVariants]
  );

  // Handle variant change
  const handleVariantChange = useCallback(
    (groupName: string, variantId: string) => {
      if (!selectedItem || selectedItem.type !== "puppet" || !selectedItem.metadata) return;

      const group = selectedItem.metadata.variantGroups.find(g => g.group === groupName);
      if (!group) return;

      // Store active variant
      const key = `${selectedItem.id}:${groupName}`;
      setActiveVariants(prev => ({ ...prev, [key]: variantId }));

      // Find the puppet root
      const anchor = selectedItem.el;
      const puppetRoot = anchor.firstChild as SVGGElement | null;
      if (!puppetRoot) return;

      // Find the target member to get its parent for z-ordering
      const variantInfo = group.variants.find(v => v.id === variantId);
      const targetMember = variantInfo?.targetMemberId
        ? puppetRoot.querySelector(`#${CSS.escape(variantInfo.targetMemberId)}`) as SVGElement | null
        : null;
      const targetParent = targetMember?.parentNode;

      // Search in the entire puppet root (variants may be in separate groups)
      group.variants.forEach(variant => {
        const el = puppetRoot.querySelector(`#${CSS.escape(variant.id)}`) as SVGElement | null;
        if (el) {
          // Show/hide the variant element
          if (variant.id === variantId) {
            el.style.display = '';
            el.removeAttribute('display');

            // Handle isBehindParent - reorder relative to target member's siblings
            if (targetParent && targetMember) {
              // Remove from current location
              if (el.parentNode) {
                el.parentNode.removeChild(el);
              }

              // Insert in target member's parent at the right position
              if (variant.isBehindParent) {
                targetParent.insertBefore(el, targetParent.firstChild);
              } else {
                // Insert at same position as target member
                targetParent.insertBefore(el, targetMember);
              }
            }
          } else {
            el.style.display = 'none';
          }

          // Also handle parent container (var_XXX groups have display="none" attribute)
          let parent = el.parentElement;
          while (parent && parent !== puppetRoot) {
            if (parent.hasAttribute('display')) {
              parent.removeAttribute('display');
              parent.style.display = '';
            }
            parent = parent.parentElement as SVGElement | null;
          }
        }
      });
    },
    [selectedItem]
  );

  // Handle detaching image from puppet member
  const handleDetachFromMember = useCallback(() => {
    if (!selectedItem || selectedItem.type !== "image") return;

    const imageEl = selectedItem.el as SVGImageElement;
    if (!imageEl.hasAttribute('data-attached-to-puppet')) return;

    try {
      const svg = imageEl.ownerSVGElement;
      if (!svg) return;

      // Get viewport to calculate scene-relative coordinates
      const viewport = svg.querySelector('[data-viewport]') as SVGGElement | null;
      if (!viewport) return;

      // Get image dimensions
      const imgW = parseFloat(imageEl.getAttribute('width') || '0');
      const imgH = parseFloat(imageEl.getAttribute('height') || '0');

      // Get image's ABSOLUTE position with all inherited transforms
      const imageScreenCTM = imageEl.getScreenCTM();
      const viewportScreenCTM = viewport.getScreenCTM();
      if (!imageScreenCTM || !viewportScreenCTM) return;

      // Get image center in screen coordinates
      const imgX = parseFloat(imageEl.getAttribute('x') || '0');
      const imgY = parseFloat(imageEl.getAttribute('y') || '0');

      const centerPoint = svg.createSVGPoint();
      centerPoint.x = imgX + imgW / 2;
      centerPoint.y = imgY + imgH / 2;
      const screenCenter = centerPoint.matrixTransform(imageScreenCTM);

      // Convert to viewport (scene) coordinates
      const viewportInverse = viewportScreenCTM.inverse();
      const sceneCenter = screenCenter.matrixTransform(viewportInverse);

      // Calculate top-left from center
      const sceneX = sceneCenter.x - imgW / 2;
      const sceneY = sceneCenter.y - imgH / 2;

      // Get inherited rotation from parent member
      const parentCTM = imageEl.parentElement?.getCTM();
      const viewportCTM = viewport.getCTM();
      let inheritedRotation = 0;

      if (parentCTM && viewportCTM) {
        // Extract rotation from matrix
        const angle = Math.atan2(parentCTM.b, parentCTM.a) * (180 / Math.PI);
        inheritedRotation = angle;
      }

      // Get the scene group
      const scene = svg.querySelector('[data-scene="true"]') as SVGGElement | null;
      if (!scene) return;

      // Remove from current parent (member)
      if (imageEl.parentNode) {
        imageEl.parentNode.removeChild(imageEl);
      }

      // Set position in scene coordinates
      imageEl.setAttribute('x', String(Math.round(sceneX)));
      imageEl.setAttribute('y', String(Math.round(sceneY)));

      // Apply inherited rotation as transform
      if (Math.abs(inheritedRotation) > 0.1) {
        const cx = sceneX + imgW / 2;
        const cy = sceneY + imgH / 2;
        imageEl.setAttribute('transform', `rotate(${inheritedRotation} ${cx} ${cy})`);
      } else {
        imageEl.removeAttribute('transform');
      }

      // Restore draggable
      imageEl.setAttribute('data-draggable', 'true');

      // Remove attachment markers
      imageEl.removeAttribute('data-attached-to-puppet');
      imageEl.removeAttribute('data-attached-to-member');

      // Add back to scene
      scene.appendChild(imageEl);
    } catch (error) {
      alert('Failed to detach image. Please try again.');
    }
  }, [selectedItem]);

  // Handle attaching image to puppet member
  const handleAttachToMember = useCallback(
    (targetValue: string) => {
      if (!selectedItem || selectedItem.type !== "image") return;

      const [puppetId, memberId] = targetValue.split(':');
      const puppet = sceneItems.find(item => item.id === puppetId);
      if (!puppet || puppet.type !== 'puppet') return;

      const puppetAnchor = puppet.el as SVGGElement;
      const puppetRoot = puppetAnchor.firstChild as SVGGElement | null;
      if (!puppetRoot) return;

      // Find the target member - could be a variant!
      let member = puppetRoot.querySelector(`#${CSS.escape(memberId)}`) as SVGGElement | null;
      if (!member) return;

      // If member has variants and is hidden, find the visible variant instead
      if (member.style.display === 'none' || member.getAttribute('display') === 'none') {
        // Look for visible variant that targets this member
        const visibleVariant = Array.from(puppetRoot.querySelectorAll(`[data-variant-groupe]`))
          .find(el => {
            const targetId = el.getAttribute('data-variant-target') || el.id;
            return targetId &&
                   el.getAttribute('data-variant-groupe') === member?.getAttribute('data-variant-groupe') &&
                   el.getAttribute('display') !== 'none' &&
                   (el as HTMLElement).style.display !== 'none';
          }) as SVGGElement | null;

        if (visibleVariant) {
          member = visibleVariant;
        }
      }

      const imageEl = selectedItem.el as SVGImageElement;

      try {
        // Get viewBox group (scene container) to get correct coordinates
        const svg = imageEl.ownerSVGElement;
        if (!svg) return;
        const viewport = svg.querySelector('[data-viewport]') as SVGGElement | null;
        if (!viewport) return;

        // Image dimensions
        const imgW = parseFloat(imageEl.getAttribute('width') || '0');
        const imgH = parseFloat(imageEl.getAttribute('height') || '0');

        // Image center in scene coordinates (without pan/zoom)
        const imgX = parseFloat(imageEl.getAttribute('x') || '0');
        const imgY = parseFloat(imageEl.getAttribute('y') || '0');
        const imgCenterX = imgX + imgW / 2;
        const imgCenterY = imgY + imgH / 2;

        // Get puppet anchor transform
        const puppetTransform = puppetAnchor.getAttribute('transform') || '';
        const puppetMatch = puppetTransform.match(/translate\(([-\d.]+)[,\s]+([-\d.]+)\)/);
        const puppetTx = puppetMatch ? parseFloat(puppetMatch[1] || '0') : 0;
        const puppetTy = puppetMatch ? parseFloat(puppetMatch[2] || '0') : 0;

        // Get member's transformation matrix relative to viewport (not screen!)
        const memberMatrix = member.getScreenCTM();
        const viewportMatrix = viewport.getScreenCTM();
        if (!memberMatrix || !viewportMatrix) return;

        // Convert to viewport-relative matrix
        const viewportInverse = viewportMatrix.inverse();
        const memberLocalMatrix = viewportInverse.multiply(memberMatrix);

        // Transform image center to member's local space
        const memberInverse = memberLocalMatrix.inverse();
        const localPoint = svg.createSVGPoint();
        localPoint.x = imgCenterX;
        localPoint.y = imgCenterY;
        const localTransformed = localPoint.matrixTransform(memberInverse);

        // Calculate top-left from center
        const localX = localTransformed.x - imgW / 2;
        const localY = localTransformed.y - imgH / 2;

        // Remove from scene
        if (imageEl.parentNode) {
          imageEl.parentNode.removeChild(imageEl);
        }

        // Set position and attach
        imageEl.setAttribute('x', String(Math.round(localX)));
        imageEl.setAttribute('y', String(Math.round(localY)));
        imageEl.removeAttribute('transform');
        imageEl.removeAttribute('data-draggable');

        member.appendChild(imageEl);

        imageEl.setAttribute('data-attached-to-puppet', puppetId);
        imageEl.setAttribute('data-attached-to-member', memberId);
      } catch (error) {
        alert('Failed to attach image. Please try again.');
      }
    },
    [selectedItem, sceneItems]
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

            {/* Attach to Member (for images) */}
            {selectedItem.type === "image" && (() => {
              const imageEl = selectedItem.el as SVGImageElement;
              const isAttached = imageEl.hasAttribute('data-attached-to-puppet');
              const attachedPuppetId = imageEl.getAttribute('data-attached-to-puppet');
              const attachedMemberId = imageEl.getAttribute('data-attached-to-member');

              return (
                <div className="property-group">
                  <h4>Attachment</h4>
                  {isAttached ? (
                    <>
                      <div style={{ fontSize: 11, color: "#a0a0a0", marginBottom: 8 }}>
                        Attached to: {(() => {
                          const puppet = sceneItems.find(p => p.id === attachedPuppetId);
                          if (!puppet) return 'Unknown';
                          const puppetRoot = (puppet.el as SVGGElement).firstChild as SVGGElement | null;
                          if (!puppetRoot) return 'Unknown';
                          const member = puppetRoot.querySelector(`#${CSS.escape(attachedMemberId || '')}`) as SVGGElement | null;
                          const memberName = member?.getAttribute('data-membre') || attachedMemberId;
                          const side = member?.getAttribute('data-side');
                          const label = side ? `${memberName} (${side})` : memberName;
                          return `${puppet.label} › ${label}`;
                        })()}
                      </div>
                      <button
                        onClick={handleDetachFromMember}
                        style={{
                          width: '100%',
                          padding: 8,
                          background: '#ff9800',
                          border: 'none',
                          borderRadius: 4,
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Detach from Member
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, color: "#a0a0a0", marginBottom: 8 }}>
                        Select a puppet member to attach this image to
                      </div>
                      <select
                        onChange={(e) => e.target.value && handleAttachToMember(e.target.value)}
                        defaultValue=""
                        style={{ width: '100%', padding: '6px 8px', fontSize: 11, marginBottom: 8 }}
                      >
                        <option value="">-- Select member --</option>
                        {sceneItems
                          .filter(item => item.type === 'puppet')
                          .map(puppet => {
                            const anchor = puppet.el;
                            const puppetRoot = anchor.firstChild as SVGGElement | null;
                            if (!puppetRoot) return null;
                            const members = puppetRoot.querySelectorAll('[data-membre]');
                            return Array.from(members).map((member) => {
                              const name = member.getAttribute('data-membre') || member.id;
                              const side = member.getAttribute('data-side');
                              const label = side ? `${name} (${side})` : name;
                              return (
                                <option key={`${puppet.id}:${member.id}`} value={`${puppet.id}:${member.id}`}>
                                  {puppet.label} › {label}
                                </option>
                              );
                            });
                          })
                          .flat()
                          .filter(Boolean)}
                      </select>
                    </>
                  )}
                </div>
              );
            })()}

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

            {/* Puppet Variants */}
            {selectedItem.type === "puppet" && selectedItem.metadata?.variantGroups && selectedItem.metadata.variantGroups.length > 0 && (
              <div className="property-group">
                <h4>Variants</h4>
                {selectedItem.metadata.variantGroups.map((group) => (
                  <div key={group.group} className="property">
                    <label>{group.group}</label>
                    <select
                      value={getCurrentVariant(group.group) || group.defaultVariantId || ''}
                      onChange={(e) => handleVariantChange(group.group, e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', fontSize: 11 }}
                    >
                      {group.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.name || variant.id}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

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
