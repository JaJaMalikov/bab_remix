import {
  getRotationFromTransform,
  readGraphicTransform,
  setImageTransform,
  parseTransformAttribute,
} from "./svgTransform";
import { getNumberAttribute } from "./numbers";

type AttachmentLayer = "front" | "behind";

const getAnchorTranslation = (anchor: SVGGElement | null) => {
  if (!anchor) return { tx: 0, ty: 0 };
  const parsed = parseTransformAttribute(anchor);
  return {
    tx: parsed.translate?.x ?? 0,
    ty: parsed.translate?.y ?? 0,
  };
};

const findSceneRoot = (element: SVGGraphicsElement) => {
  const svg = element.ownerSVGElement;
  if (!svg) return null;
  return svg.querySelector("[data-scene]") as SVGGElement | null;
};

const findAnchorById = (element: SVGGraphicsElement) => {
  const puppetId = element.getAttribute("data-attached-to-puppet");
  const svg = element.ownerSVGElement;
  if (!svg || !puppetId) return null;
  return svg.querySelector(
    `[data-anchor="puppet"][data-id="${CSS.escape(puppetId)}"]`,
  ) as SVGGElement | null;
};

const findAnchorForMember = (member: SVGGElement | null) =>
  member?.closest('[data-anchor="puppet"]') as SVGGElement | null;

const applyLayer = (
  element: SVGGraphicsElement,
  member: SVGGElement,
  layer: AttachmentLayer,
) => {
  if (layer === "behind" && member.firstChild) {
    member.insertBefore(element, member.firstChild);
  } else {
    member.appendChild(element);
  }
};

export const embedAttachmentIntoMember = ({
  element,
  member,
  anchor,
  layer = "front",
}: {
  element: SVGGraphicsElement;
  member: SVGGElement;
  anchor: SVGGElement;
  layer?: AttachmentLayer;
}) => {
  const sceneX = getNumberAttribute(element, "x");
  const sceneY = getNumberAttribute(element, "y");
  const { tx, ty } = getAnchorTranslation(anchor);

  const localX = sceneX - tx;
  const localY = sceneY - ty;

  element.setAttribute("x", String(localX));
  element.setAttribute("y", String(localY));
  element.setAttribute("data-attached-mode", "embedded");
  element.setAttribute("data-attachment-layer", layer);
  element.removeAttribute("data-draggable");

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

  const layer =
    (element.getAttribute("data-attachment-layer") as AttachmentLayer) ||
    "front";
  applyLayer(element, member, layer);

  const localX = getNumberAttribute(element, "x");
  const localY = getNumberAttribute(element, "y");
  element.setAttribute("x", String(localX));
  element.setAttribute("y", String(localY));

  return true;
};

export const releaseAttachmentFromMember = (element: SVGGraphicsElement) => {
  // --- POSITION PART (simple logic) ---
  const anchor = findAnchorById(element);
  const { tx, ty } = getAnchorTranslation(anchor);
  const localX = getNumberAttribute(element, "x");
  const localY = getNumberAttribute(element, "y");
  const sceneX = localX + tx;
  const sceneY = localY + ty;

  // --- ROTATION PART (literal interpretation of user request) ---
  let finalRotation = 0;

  // Get object's own rotation before detachment
  const objectTransform = readGraphicTransform(element);
  finalRotation += objectTransform.rotation;

  // Find the member it was attached to and add its rotation
  const memberId = element.getAttribute("data-attached-to-member");
  if (anchor && memberId) {
    // Members can be inside a puppet root group
    const puppetRoot = anchor.firstChild as SVGGElement | null;
    const memberEl = puppetRoot?.querySelector(
      `#${CSS.escape(memberId)}`,
    ) as SVGGElement | null;
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

  element.setAttribute("x", String(sceneX));
  element.setAttribute("y", String(sceneY));

  // Apply the new combined rotation, preserving existing scale
  setImageTransform(
    element,
    finalRotation,
    objectTransform.scaleX,
    objectTransform.scaleY,
  );

  element.setAttribute("data-draggable", "true");
  element.removeAttribute("data-attached-mode");
  element.removeAttribute("data-attachment-layer");

  // Return all new values so the caller can update keyframes
  return {
    sceneX,
    sceneY,
    rotation: finalRotation,
    scaleX: objectTransform.scaleX,
    scaleY: objectTransform.scaleY,
  };
};
