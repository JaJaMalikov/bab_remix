import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockUseAnimation = vi.hoisted(() => vi.fn());
const mockUseUi = vi.hoisted(() => vi.fn());
const mockFindVisibleVariant = vi.hoisted(() => vi.fn());
const mockEmbedAttachment = vi.hoisted(() => vi.fn());
const mockReleaseAttachment = vi.hoisted(() => vi.fn());

vi.mock("../../src/context/AnimationContext", () => ({
  useAnimation: () => mockUseAnimation(),
}));

vi.mock("../../src/context/UiContext", () => ({
  useUi: () => mockUseUi(),
}));

vi.mock("../../src/utils/svgVariants", () => ({
  findVisibleVariant: mockFindVisibleVariant,
}));

vi.mock("../../src/utils/attachment", () => ({
  embedAttachmentIntoMember: mockEmbedAttachment,
  releaseAttachmentFromMember: mockReleaseAttachment,
}));

import { useAttachmentAnimation } from "../../src/hooks/useAttachmentAnimation";

describe("useAttachmentAnimation", () => {
  beforeEach(() => {
    mockUseAnimation.mockReset();
    mockUseUi.mockReset();
    mockFindVisibleVariant.mockReset();
    mockEmbedAttachment.mockReset();
    mockReleaseAttachment.mockReset();
    mockReleaseAttachment.mockImplementation((el: SVGGraphicsElement) => {
      el.removeAttribute("data-attached-mode");
    });
  });

  const renderHookWithState = () => renderHook(() => useAttachmentAnimation());

  it("libère et réinitialise l'image quand aucune attache n'est spécifiée", async () => {
    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("data-attached-mode", "embedded");
    image.setAttribute("data-attached-to-puppet", "p1");
    image.setAttribute("data-attached-to-member", "arm");
    image.setAttribute("data-attachment-offset-cx", "5");
    image.setAttribute("data-attachment-offset-cy", "7");

    mockUseAnimation.mockReturnValue({
      currentFrame: 0,
      tracks: [{ property: "attachment", targetId: "img-1" }],
      getValueAtFrame: vi.fn().mockReturnValue(""),
    });

    mockUseUi.mockReturnValue({
      sceneItems: [
        {
          id: "img-1",
          type: "image" as const,
          label: "Img",
          el: image,
        },
      ],
    });

    renderHookWithState();

    await waitFor(() => expect(mockReleaseAttachment).toHaveBeenCalledWith(image));
    expect(image.getAttribute("data-attached-mode")).toBeNull();
    expect(image.getAttribute("data-attached-to-puppet")).toBeNull();
    expect(image.getAttribute("data-attached-to-member")).toBeNull();
    expect(image.getAttribute("data-attachment-offset-cx")).toBeNull();
    expect(image.getAttribute("data-attachment-offset-cy")).toBeNull();
    expect(mockEmbedAttachment).not.toHaveBeenCalled();
  });

  it("intègre l'image au membre cible lorsque l'attache change", () => {
    const anchor = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const puppetRoot = document.createElementNS("http://www.w3.org/2000/svg", "g");
    anchor.appendChild(puppetRoot);
    anchor.setAttribute("data-anchor", "puppet");
    const member = document.createElementNS("http://www.w3.org/2000/svg", "g");
    puppetRoot.appendChild(member);

    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("data-id", "img-2");

    mockFindVisibleVariant.mockReturnValue(member);
    mockEmbedAttachment.mockReturnValue({ localX: 10, localY: 12 });

    mockUseAnimation.mockReturnValue({
      currentFrame: 12,
      tracks: [{ property: "attachment", targetId: "img-2" }],
      getValueAtFrame: vi.fn().mockReturnValue("puppet-1:limb-1"),
    });

    mockUseUi.mockReturnValue({
      sceneItems: [
        {
          id: "puppet-1",
          type: "puppet" as const,
          label: "Puppet",
          el: anchor,
        },
        {
          id: "img-2",
          type: "image" as const,
          label: "Image",
          el: image,
        },
      ],
    });

    renderHookWithState();

    expect(mockFindVisibleVariant).toHaveBeenCalledWith(puppetRoot, "limb-1");
    expect(mockEmbedAttachment).toHaveBeenCalledWith({
      element: image,
      member,
      anchor,
    });
    expect(image.getAttribute("data-attached-to-puppet")).toBe("puppet-1");
    expect(image.getAttribute("data-attached-to-member")).toBe("limb-1");
    expect(image.getAttribute("data-attachment-offset-cx")).toBeNull();
    expect(image.getAttribute("data-attachment-offset-cy")).toBeNull();
    expect(mockReleaseAttachment).not.toHaveBeenCalled();
  });
});
