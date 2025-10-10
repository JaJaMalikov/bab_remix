import { useEffect, useRef } from "react";
import type { CSSProperties, RefObject } from "react";

type PuppetPivot = {
  x: number;
  y: number;
};

type PuppetMemberMetadata = {
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

type PuppetVariantMetadata = {
  id: string | null;
  targetMemberId: string | null;
  memberId: string | null;
  name: string | null;
  isDefault: boolean;
  isBehindParent: boolean;
  side: string | null;
};

type PuppetVariantGroupMetadata = {
  group: string;
  defaultVariantId: string | null;
  variants: PuppetVariantMetadata[];
};

type PuppetMetadata = {
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

// Module-level caches for processed puppet data and metadata
const puppetCache = new Map<string, SVGGElement>();
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

const applyMetadataToGroup = (group: SVGGElement, metadata: PuppetMetadata | null | undefined) => {
  if (!metadata) return;

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

/**
 * Parses SVG text and processes it into a ready-to-use puppet element.
 * @param svgText The raw SVG content.
 * @param metadata Optional pre-parsed metadata describing the puppet.
 * @returns A processed SVGGElement or null if parsing fails.
 */
function processSvgText(svgText: string, metadata?: PuppetMetadata | null): SVGGElement | null {
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

  // Create container group
  const container = document.createElementNS("http://www.w3.org/2000/svg", "g");

  // Clone the main puppet (torse)
  const mainPuppet = torse.cloneNode(true) as SVGGElement;
  container.appendChild(mainPuppet);

  // Clone all variant groups (siblings of torse)
  const children = Array.from(svgRoot.children);
  for (const child of children) {
    if (child !== torse && child.nodeType === 1) {
      const cloned = child.cloneNode(true) as SVGElement;
      container.appendChild(cloned);
    }
  }

  if (metadata) {
    applyMetadataToGroup(container, metadata);
  } else {
    fallbackProcessLimbs(container);
    fallbackReorderBehindElements(container);
  }
  return container;
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

type Props = {
  src: string;
  as?: "g" | "svg";
  className?: string;
  transform?: string;
  style?: CSSProperties;
  onReady?: (rootGroup: SVGGElement, metadata?: PuppetMetadata | null) => void;
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

    const injectPuppet = (puppetG: SVGGElement, metadata?: PuppetMetadata | null) => {
      const host = ref.current;
      if (!host) return;

      // Clean up previous puppet if any
      if (injectedRef.current && injectedRef.current.parentNode) {
        injectedRef.current.parentNode.removeChild(injectedRef.current);
      }

      // Append the new puppet and notify parent
      host.appendChild(puppetG);
      injectedRef.current = puppetG;
      onReadyRef.current?.(puppetG, metadata);
    }

    async function run() {
      const metadataUrl = toMetadataUrl(src);

      // 1. Check cache first
      if (puppetCache.has(src)) {
        const cachedG = puppetCache.get(src)!;
        const metadata = metadataUrl ? metadataCache.get(metadataUrl) ?? null : null;
        if (!cancelled) {
          injectPuppet(cachedG.cloneNode(true) as SVGGElement, metadata);
        }
        return;
      }

      // 2. If not in cache, fetch and process
      try {
        const [metadata, response] = await Promise.all([
          fetchMetadata(metadataUrl),
          fetch(src),
        ]);
        if (cancelled) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const txt = await response.text();
        if (cancelled) return;

        const processedG = processSvgText(txt, metadata);
        if (processedG) {
          // 3. Store in cache
          puppetCache.set(src, processedG);
          if (!cancelled) {
            injectPuppet(processedG.cloneNode(true) as SVGGElement, metadata);
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
