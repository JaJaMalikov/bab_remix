import { vi, describe, it, expect, beforeEach } from "vitest";

const svgTransformMocks = vi.hoisted(() => ({
  parseTransformAttribute: vi.fn(() => ({
    translate: { x: 10, y: 20 },
  })),
  readGraphicTransform: vi.fn(() => ({
    rotation: 5,
    scaleX: 1,
    scaleY: 1,
  })),
  getRotationFromTransform: vi.fn(() => 15),
  setImageTransform: vi.fn(),
}));

vi.mock("../../src/utils/svgTransform", () => svgTransformMocks);

import {
  embedAttachmentIntoMember,
  ensureEmbeddedAttachment,
  releaseAttachmentFromMember,
} from "../../src/utils/attachment";

const createSvgElement = <K extends keyof SVGElementTagNameMap>(
  name: K,
): SVGElementTagNameMap[K] =>
  document.createElementNS("http://www.w3.org/2000/svg", name);

describe("attachment utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("intègre une pièce jointe dans un membre avec coordonnées locales", () => {
    const element = createSvgElement("image");
    element.setAttribute("x", "60");
    element.setAttribute("y", "40");
    element.setAttribute("data-draggable", "true");

    const member = createSvgElement("g");
    const anchor = createSvgElement("g");

    const result = embedAttachmentIntoMember({
      element,
      member,
      anchor,
    });

    expect(result).toEqual({ localX: 50, localY: 20 });
    expect(element.getAttribute("x")).toBe("50");
    expect(element.getAttribute("y")).toBe("20");
    expect(element.getAttribute("data-attached-mode")).toBe("embedded");
    expect(element.hasAttribute("data-draggable")).toBe(false);
    expect(member.lastChild).toBe(element);
  });

  it("replace l'élément s'il est déjà embarqué", () => {
    const anchor = createSvgElement("g");
    anchor.setAttribute("data-anchor", "puppet");

    const member = createSvgElement("g");
    anchor.appendChild(member);

    const element = createSvgElement("image");
    element.setAttribute("x", "8");
    element.setAttribute("y", "4");
    element.setAttribute("data-attachment-layer", "behind");
    member.appendChild(element);

    const moved = ensureEmbeddedAttachment({ element, member });
    expect(moved).toBe(true);
    expect(member.firstChild).toBe(element);
    expect(element.getAttribute("x")).toBe("8");
    expect(element.getAttribute("y")).toBe("4");
  });

  it("libère la pièce jointe et la replace dans la scène", () => {
    const svg = createSvgElement("svg");
    const scene = createSvgElement("g");
    scene.setAttribute("data-scene", "");
    svg.appendChild(scene);

    const anchor = createSvgElement("g");
    anchor.setAttribute("data-anchor", "puppet");
    anchor.setAttribute("data-id", "puppet-1");
    svg.appendChild(anchor);

    const puppetRoot = createSvgElement("g");
    const member = createSvgElement("g");
    member.id = "member-1";
    member.style.transform = "rotate(15deg)";
    puppetRoot.appendChild(member);
    anchor.appendChild(puppetRoot);

    const element = createSvgElement("image");
    element.setAttribute("x", "5");
    element.setAttribute("y", "7");
    element.setAttribute("data-attached-to-puppet", "puppet-1");
    element.setAttribute("data-attached-to-member", "member-1");
    element.setAttribute("data-attached-mode", "embedded");
    member.appendChild(element);

    document.body.appendChild(svg);
    const result = releaseAttachmentFromMember(element);

    expect(result).toEqual({
      sceneX: 15,
      sceneY: 27,
      rotation: 20,
      scaleX: 1,
      scaleY: 1,
    });

    expect(scene.contains(element)).toBe(true);
    expect(element.getAttribute("x")).toBe("15");
    expect(element.getAttribute("y")).toBe("27");
    expect(element.getAttribute("data-draggable")).toBe("true");
    expect(element.hasAttribute("data-attached-mode")).toBe(false);
    expect(svgTransformMocks.setImageTransform).toHaveBeenCalledWith(
      element,
      20,
      1,
      1,
    );

    document.body.removeChild(svg);
  });
});
