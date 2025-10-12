type VariantInfo = {
  targetMemberId: string | null;
  name: string | null;
  isDefault?: boolean;
  isBehindParent?: boolean;
};

export type VariantGroupMetadata = {
  group: string;
  variants: VariantInfo[];
};

type TargetMemberContext = {
  member: SVGGElement | null;
  parent: SVGGElement | null;
};

const cssEscape = (value: string) => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/([.*+?^${}()|[\]\\])/g, "\\$1");
};

const queryMemberById = (root: SVGGElement, id: string): SVGGElement | null => {
  return root.querySelector(`#${cssEscape(id)}`) as SVGGElement | null;
};

export const getTargetMemberContext = (
  puppetRoot: SVGGElement,
  targetMemberId: string | null,
): TargetMemberContext => {
  if (!targetMemberId) {
    return { member: null, parent: null };
  }

  const member = queryMemberById(puppetRoot, targetMemberId);
  if (!member) {
    return { member: null, parent: null };
  }

  const parentId = member.getAttribute("data-parent");
  if (parentId) {
    const parent = queryMemberById(puppetRoot, parentId);
    if (parent) {
      return { member, parent };
    }
  }

  const parentNode = member.parentNode;
  if (parentNode instanceof SVGGElement) {
    return { member, parent: parentNode };
  }

  return { member, parent: null };
};

const getTargetMemberId = (group: VariantGroupMetadata): string | null => {
  for (const variant of group.variants) {
    if (variant.targetMemberId) {
      return variant.targetMemberId;
    }
  }
  return group.variants[0]?.targetMemberId ?? null;
};

export const applyVariantSelection = (
  puppetRoot: SVGGElement,
  group: VariantGroupMetadata,
  selectedVariantName: string | null,
) => {
  const targetMemberId = getTargetMemberId(group);
  const { member: targetMember, parent: targetParent } = getTargetMemberContext(
    puppetRoot,
    targetMemberId,
  );

  const ensureMemberInParent = () => {
    if (!targetMember || !targetParent) {
      return;
    }
    if (targetMember.parentNode !== targetParent) {
      targetParent.appendChild(targetMember);
    }
  };

  ensureMemberInParent();

  group.variants.forEach((variant) => {
    if (!variant.name) return;

    const selector = `[data-variant-groupe="${group.group}"][data-variant-name="${variant.name}"]`;
    const variantElement = puppetRoot.querySelector(selector) as SVGGElement | null;
    if (!variantElement) return;

    const shouldShow = variant.name === selectedVariantName;
    if (!shouldShow) {
      variantElement.style.display = "none";
      return;
    }

    variantElement.style.display = "";
    variantElement.removeAttribute("display");

    // Ensure parent chain is visible
    let currentParent = variantElement.parentElement as SVGElement | null;
    while (currentParent && currentParent !== puppetRoot) {
      if (currentParent.hasAttribute("display")) {
        currentParent.removeAttribute("display");
      }
      currentParent.style.display = "";
      currentParent = currentParent.parentElement as SVGElement | null;
    }

    if (!targetMember) {
      return;
    }

    if (variant.isBehindParent) {
      if (targetParent) {
        if (targetMember.parentNode !== targetParent) {
          targetParent.appendChild(targetMember);
        }
        if (targetParent.firstChild !== targetMember) {
          targetParent.insertBefore(targetMember, targetParent.firstChild);
        }
      }
    } else if (targetParent) {
      targetParent.appendChild(targetMember);
    }
  });
};

export const findVisibleVariant = (
  puppetRoot: SVGGElement,
  memberId: string,
): SVGGElement | null => {
  const member = queryMemberById(puppetRoot, memberId);
  if (!member) return null;

  const memberGroup = member.getAttribute("data-variant-groupe");
  const variants = puppetRoot.querySelectorAll(
    "[data-variant-groupe]",
  ) as NodeListOf<SVGGElement>;

  for (const variant of variants) {
    const attrDisplay = variant.getAttribute("display");
    const inlineDisplay = (variant as SVGElement).style.display;
    if (attrDisplay === "none" || inlineDisplay === "none") {
      continue;
    }

    const targetId = variant.getAttribute("data-variant-target") || variant.id;
    const groupName = variant.getAttribute("data-variant-groupe");
    if (
      (targetId && targetId === memberId) ||
      (memberGroup && groupName === memberGroup)
    ) {
      return variant;
    }
  }

  return null;
};
