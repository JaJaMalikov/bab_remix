import { useEffect, useRef } from "react";
import type { CSSProperties, RefObject } from "react";

export type PuppetPivot = {
  x: number;
  y: number;
};

export type PuppetMemberMetadata = {
  id: string;
  name: string;
  parentId: string | null;
  children: string[];
  pivot: PuppetPivot | null;
  interactive: boolean;
  draggable: boolean;
  isBehindParent: boolean;
  side: string | null;
  variantGroup: string | null;
  variantName: string | null;
  variantDefault: boolean;
};

export type PuppetVariantMetadata = {
  id: string | null;
  targetMemberId: string | null;
  memberId: string | null;
  name: string | null;
  isDefault: boolean;
  isBehindParent: boolean;
  side: string | null;
};

export type PuppetVariantGroupMetadata = {
  group: string;
  defaultVariantId: string | null;
  variants: PuppetVariantMetadata[];
};

export type PuppetMetadata = {
  id: string;
  source: string;
  width: number | null;
  height: number | null;
  viewBox: string | null;
  generatedAt?: string;
  rootMemberId: string | null;
  members: PuppetMemberMetadata[];
  variantGroups: PuppetVariantGroupMetadata[];
};

export type PuppetVariantSelections = Record<string, string | null>;

// Module-level caches for processed puppet data and metadata
type CachedPuppet = { element: SVGGElement; defaults: PuppetVariantSelections };
const puppetCache = new Map<string, CachedPuppet>();
const metadataCache = new Map<string, PuppetMetadata | null>();

const TRANSFORM_BOX_STYLE_KEY = "transformBox" as const;

const cssEscape = (value: string) => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/([.*+?^${}()|[\]\\])/g, "\\$1");
};

const setPivotOnElement = (element: SVGGElement, pivot: PuppetPivot) => {
  const style = element.style as CSSStyleDeclaration & { [TRANSFORM_BOX_STYLE_KEY]?: string };
  style[TRANSFORM_BOX_STYLE_KEY] = "view-box";
  style.transformOrigin = `${pivot.x}px ${pivot.y}px`;
};

const getVariantElement = (
  root: SVGGElement,
  variant: PuppetVariantMetadata,
): SVGGraphicsElement | null => {
  const candidateIds = [variant.id, variant.memberId, variant.targetMemberId];
  for (const id of candidateIds) {
    if (!id) continue;
    const el = root.querySelector(`#${cssEscape(id)}`) as SVGGraphicsElement | null;
    if (el) return el;
  }
  return null;
};

const variantMatchesId = (variant: PuppetVariantMetadata, targetId: string | null) => {
  if (!targetId) return false;
  return variant.id === targetId || variant.memberId === targetId || variant.targetMemberId === targetId;
};

const applyVariantGroupSelection = (
  root: SVGGElement,
  group: PuppetVariantGroupMetadata,
  targetId: string | null,
): string | null => {
  const fallback = group.variants.find((v) => v.isDefault) ?? group.variants[0] ?? null;
  const desiredId = targetId ?? group.defaultVariantId ?? fallback?.id ?? fallback?.memberId ?? null;

  let appliedId: string | null = null;
  for (const variant of group.variants) {
    const el = getVariantElement(root, variant);
    if (!el) continue;
    const show = desiredId ? variantMatchesId(variant, desiredId) : variant.isDefault;
    if (show) {
      appliedId = variant.id ?? variant.memberId ?? variant.targetMemberId ?? appliedId;
      el.style.display = "";
      if (variant.isBehindParent) {
        const parent = el.parentNode;
        if (parent && parent.firstChild !== el) {
          parent.insertBefore(el, parent.firstChild);
        }
      }
    } else {
      el.style.display = "none";
    }
  }
  return appliedId ?? null;
};

const applyMetadataToGroup = (
  group: SVGGElement,
  metadata: PuppetMetadata | null | undefined,
): PuppetVariantSelections => {
  const selections: PuppetVariantSelections = {};
  if (!metadata) return selections;

  const behindElements: SVGGElement[] = [];

  for (const member of metadata.members) {
    const isRoot = metadata.rootMemberId === member.id;
    const target = isRoot
      ? group
      : (group.querySelector(`#${cssEscape(member.id)}`) as SVGGElement | null);
    if (!target) continue;

    if (member.pivot) {
      setPivotOnElement(target, member.pivot);
    }

    if (member.isBehindParent) {
      behindElements.push(target);
    }
  }

  for (let i = behindElements.length - 1; i >= 0; i--) {
    const el = behindElements[i]!;
    const parent = el.parentNode;
    if (!parent) continue;
    if (parent.firstChild !== el) parent.insertBefore(el, parent.firstChild);
  }

  for (const groupMeta of metadata.variantGroups) {
    selections[groupMeta.group] = applyVariantGroupSelection(group, groupMeta, groupMeta.defaultVariantId);
  }

  return selections;
};

const fallbackProcessLimbs = (group: SVGGElement) => {
  const limbs = group.querySelectorAll('g[data-pivot]') as NodeListOf<SVGGElement>;
  limbs.forEach((el) => {
    const attr = el.getAttribute("data-pivot");
    if (!attr) return;
    const [sxStr, syStr] = attr.split(",");
    const sx = parseFloat((sxStr || "").trim());
    const sy = parseFloat((syStr || "").trim());
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;
    setPivotOnElement(el, { x: sx, y: sy });
  });
};

const fallbackReorderBehindElements = (group: SVGGElement) => {
  const behind = Array.from(
    group.querySelectorAll('[data-isbehindparent="true"]') as NodeListOf<SVGGElement>,
  );
  for (let i = behind.length - 1; i >= 0; i--) {
    const el = behind[i]!;
    const parent = el.parentNode;
    if (!parent) continue;
    if (parent.firstChild !== el) parent.insertBefore(el, parent.firstChild);
  }
};

const cloneGroup = (group: SVGGElement) => group.cloneNode(true) as SVGGElement;

type ProcessedPuppet = { element: SVGGElement; defaults: PuppetVariantSelections };

/**
 * Parses SVG text and processes it into a ready-to-use puppet element.
 * @param svgText The raw SVG content.
 * @param metadata Optional pre-parsed metadata describing the puppet.
 * @returns A processed SVGGElement or null if parsing fails.
 */
function processSvgText(svgText: string, metadata?: PuppetMetadata | null): ProcessedPuppet | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svgRoot = doc.documentElement as unknown as SVGSVGElement;

  let torse: SVGGElement | null = null;
  if (metadata?.rootMemberId) {
    torse = svgRoot.querySelector(`#${cssEscape(metadata.rootMemberId)}`) as SVGGElement | null;
  }
  if (!torse) {
    torse = svgRoot.querySelector('[data-membre="torse"]') as SVGGElement | null;
  }
  if (!torse) return null;

  const g = torse.cloneNode(true) as SVGGElement;
  let defaults: PuppetVariantSelections = {};
  if (metadata) {
    defaults = applyMetadataToGroup(g, metadata);
  } else {
    fallbackProcessLimbs(g);
    fallbackReorderBehindElements(g);
  }
  return { element: g, defaults };
}

const toMetadataUrl = (src: string) => {
  if (!src.toLowerCase().endsWith(".svg")) return null;
  const queryIndex = src.indexOf("?");
  if (queryIndex === -1) {
    return src.replace(/\.svg$/i, ".json");
  }
  const base = src.slice(0, queryIndex);
  const query = src.slice(queryIndex);
  return `${base.replace(/\.svg$/i, ".json")}${query}`;
};

const fetchMetadata = async (url: string | null) => {
  if (!url) return null;
  if (metadataCache.has(url)) {
    return metadataCache.get(url) ?? null;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      metadataCache.set(url, null);
      return null;
    }
    const data = (await res.json()) as PuppetMetadata;
    metadataCache.set(url, data);
    return data;
  } catch (error) {
    console.error(`Failed to load puppet metadata from ${url}`, error);
    metadataCache.set(url, null);
    return null;
  }
};

export const getDefaultVariantSelections = (
  metadata: PuppetMetadata | null | undefined,
): PuppetVariantSelections => {
  const defaults: PuppetVariantSelections = {};
  if (!metadata) return defaults;
  for (const group of metadata.variantGroups) {
    const fallback =
      group.defaultVariantId ??
      group.variants.find((v) => v.isDefault)?.id ??
      group.variants[0]?.id ??
      group.variants[0]?.memberId ??
      null;
    defaults[group.group] = fallback ?? null;
  }
  return defaults;
};

export const applyPuppetVariants = (
  root: SVGGElement,
  metadata: PuppetMetadata | null | undefined,
  selections: PuppetVariantSelections,
): PuppetVariantSelections => {
  if (!metadata) return {};
  const next: PuppetVariantSelections = {};
  for (const group of metadata.variantGroups) {
    const desired = selections[group.group] ?? null;
    next[group.group] = applyVariantGroupSelection(root, group, desired);
  }
  return next;
};

export const setPuppetVariantSelection = (
  root: SVGGElement,
  metadata: PuppetMetadata | null | undefined,
  groupName: string,
  variantId: string | null,
): string | null => {
  if (!metadata) return null;
  const group = metadata.variantGroups.find((g) => g.group === groupName);
  if (!group) return null;
  return applyVariantGroupSelection(root, group, variantId);
};

type Props = {
  src: string;
  as?: "g" | "svg";
  className?: string;
  transform?: string;
  style?: CSSProperties;
  onReady?: (
    rootGroup: SVGGElement,
    metadata: PuppetMetadata | null,
    defaults: PuppetVariantSelections,
  ) => void;
};

export function SvgPuppetInlineSimple({
  src,
  as = "g",
  className,
  transform,
  style,
  onReady,
}: Props) {
  const ref = useRef<SVGSVGElement | SVGGElement | null>(null);
  const injectedRef = useRef<SVGGElement | null>(null);
  const onReadyRef = useRef<typeof onReady>(null);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let cancelled = false;

    const injectPuppet = (cached: CachedPuppet, metadata: PuppetMetadata | null) => {
      const host = ref.current;
      if (!host) return;

      if (injectedRef.current && injectedRef.current.parentNode) {
        injectedRef.current.parentNode.removeChild(injectedRef.current);
      }

      const clone = cloneGroup(cached.element);
      host.appendChild(clone);
      injectedRef.current = clone;
      onReadyRef.current?.(clone, metadata, { ...cached.defaults });
    };

    async function run() {
      const metadataUrl = toMetadataUrl(src);
      const metadata = await fetchMetadata(metadataUrl);
      if (cancelled) return;

      if (puppetCache.has(src)) {
        const cached = puppetCache.get(src)!;
        if (!cancelled) {
          injectPuppet(cached, metadata);
        }
        return;
      }

      try {
        const response = await fetch(src);
        if (cancelled) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const txt = await response.text();
        if (cancelled) return;

        const processed = processSvgText(txt, metadata);
        if (processed) {
          puppetCache.set(src, processed);
          if (!cancelled) {
            injectPuppet(processed, metadata);
          }
        }
      } catch (error) {
        console.error(`Failed to load or process puppet from ${src}`, error);
      }
    }

    run();

    return () => {
      cancelled = true;
      if (injectedRef.current && injectedRef.current.parentNode) {
        injectedRef.current.parentNode.removeChild(injectedRef.current);
      }
      injectedRef.current = null;
    };
  }, [src]);

  if (as === "svg") {
    return (
      <svg ref={ref as unknown as RefObject<SVGSVGElement>} className={className} style={style}>
        {/* pantin injecté ici */}
      </svg>
    );
  }
  return (
    <g
      ref={ref as unknown as RefObject<SVGGElement>}
      className={className}
      transform={transform}
      style={style}
    />
  );
}
