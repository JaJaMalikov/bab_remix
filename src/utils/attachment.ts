import { getRotationFromTransform, readGraphicTransform, setImageTransform } from "./svgTransform";

type AttachmentLayer = 'front' | 'behind';

const readNumberAttribute = (element: Element, name: string, fallback = 0) => {
  const value = element.getAttribute(name);
  if (value === null) return fallback;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getAnchorTranslation = (anchor: SVGGElement | null) => {
  if (!anchor) return { tx: 0, ty: 0 };
  const transformAttr = anchor.getAttribute('transform') || '';
  const match = transformAttr.match(/translate\(([-\d.]+)[,\s]+([-\d.]+)\)/);
  const tx = match ? parseFloat(match[1] || '0') : 0;
  const ty = match ? parseFloat(match[2] || '0') : 0;
  return {
    tx: Number.isFinite(tx) ? tx : 0,
    ty: Number.isFinite(ty) ? ty : 0,
  };
};

const findSceneRoot = (element: SVGGraphicsElement) => {
  const svg = element.ownerSVGElement;
  if (!svg) return null;
  return svg.querySelector('[data-scene]') as SVGGElement | null;
};

const findAnchorById = (element: SVGGraphicsElement) => {
  const puppetId = element.getAttribute('data-attached-to-puppet');
  const svg = element.ownerSVGElement;
  if (!svg || !puppetId) return null;
  return svg.querySelector(`[data-anchor="puppet"][data-id="${CSS.escape(puppetId)}"]`) as SVGGElement | null;
};

const findAnchorForMember = (member: SVGGElement | null) =>
  member?.closest('[data-anchor="puppet"]') as SVGGElement | null;

const applyLayer = (element: SVGGraphicsElement, member: SVGGElement, layer: AttachmentLayer) => {
  if (layer === 'behind' && member.firstChild) {
    member.insertBefore(element, member.firstChild);
  } else {
    member.appendChild(element);
  }
};

export const embedAttachmentIntoMember = ({
  element,
  member,
  anchor,
  layer = 'front',
}: {
  element: SVGGraphicsElement;
  member: SVGGElement;
  anchor: SVGGElement;
  layer?: AttachmentLayer;
}) => {
  const sceneX = readNumberAttribute(element, 'x');
  const sceneY = readNumberAttribute(element, 'y');
  const { tx, ty } = getAnchorTranslation(anchor);

  const localX = sceneX - tx;
  const localY = sceneY - ty;

  element.setAttribute('x', String(localX));
  element.setAttribute('y', String(localY));
  element.setAttribute('data-attached-mode', 'embedded');
  element.setAttribute('data-attachment-layer', layer);
  element.removeAttribute('data-draggable');

  applyLayer(element, member, layer);
  return { localX, localY };
};

export const ensureEmbeddedAttachment = ({
  element,
  member,
}: {
  element: SVGGraphicsElement;
  member: SVGGElement | null;
}) => {
  if (!member) return false;

  const anchor = findAnchorForMember(member);
  if (!anchor) return false;

  const layer = (element.getAttribute('data-attachment-layer') as AttachmentLayer) || 'front';
  applyLayer(element, member, layer);

  const localX = readNumberAttribute(element, 'x');
  const localY = readNumberAttribute(element, 'y');
  element.setAttribute('x', String(localX));
  element.setAttribute('y', String(localY));

  return true;
};

export const releaseAttachmentFromMember = (element: SVGGraphicsElement) => {
  // --- POSITION PART (simple logic) ---
  const anchor = findAnchorById(element);
  const { tx, ty } = getAnchorTranslation(anchor);
  const localX = readNumberAttribute(element, 'x');
  const localY = readNumberAttribute(element, 'y');
  const sceneX = localX + tx;
  const sceneY = localY + ty;

  // --- ROTATION PART (literal interpretation of user request) ---
  let finalRotation = 0;

  // Get object's own rotation before detachment
  const objectTransform = readGraphicTransform(element);
  finalRotation += objectTransform.rotation;

  // Find the member it was attached to and add its rotation
  const memberId = element.getAttribute('data-attached-to-member');
  if (anchor && memberId) {
    // Members can be inside a puppet root group
    const puppetRoot = anchor.firstChild as SVGGElement | null;
    const memberEl = puppetRoot?.querySelector(`#${CSS.escape(memberId)}`) as SVGGElement | null;
    if (memberEl) {
      // Get member's rotation from its CSS style 'transform'
      const memberRotation = getRotationFromTransform(memberEl);
      finalRotation += memberRotation;
    }
  }

  // --- REPARENT & APPLY ---
  const scene = findSceneRoot(element);
  if (scene) {
    scene.appendChild(element);
  }

  element.setAttribute('x', String(sceneX));
  element.setAttribute('y', String(sceneY));

  // Apply the new combined rotation, preserving existing scale
  setImageTransform(element, finalRotation, objectTransform.scaleX, objectTransform.scaleY);

  element.setAttribute('data-draggable', 'true');
  element.removeAttribute('data-attached-mode');
  element.removeAttribute('data-attachment-layer');

  // Return all new values so the caller can update keyframes
  return { sceneX, sceneY, rotation: finalRotation, scaleX: objectTransform.scaleX, scaleY: objectTransform.scaleY };
};