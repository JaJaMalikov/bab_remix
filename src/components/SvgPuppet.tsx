import { useEffect, useRef } from "react";
import type { CSSProperties, RefObject } from "react";

// Module-level cache for processed puppet data
const puppetCache = new Map<string, SVGGElement>();

function processLimbs(g: SVGGElement) {
  const limbs = g.querySelectorAll('g[data-pivot]') as NodeListOf<SVGGElement>;
  limbs.forEach((el) => {
    const attr = el.getAttribute("data-pivot");
    if (!attr) return;
    const [sxStr, syStr] = attr.split(",");
    const sx = parseFloat((sxStr || "").trim());
    const sy = parseFloat((syStr || "").trim());
    if (!isFinite(sx) || !isFinite(sy)) return;
    (el.style as any).transformBox = "view-box";
    el.style.transformOrigin = `${sx}px ${sy}px`;
  });
}

function reorderBehindElements(g: SVGGElement) {
  const behind = Array.from(
    g.querySelectorAll('[data-isbehindparent="true"]') as NodeListOf<SVGGElement>,
  );
  for (let i = behind.length - 1; i >= 0; i--) {
    const el = behind[i]!;
    const parent = el.parentNode;
    if (!parent) continue;
    if (parent.firstChild !== el) parent.insertBefore(el, parent.firstChild);
  }
}

/**
 * Parses SVG text and processes it into a ready-to-use puppet element.
 * @param svgText The raw SVG content.
 * @returns A processed SVGGElement or null if parsing fails.
 */
function processSvgText(svgText: string): SVGGElement | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svgRoot = doc.documentElement as unknown as SVGSVGElement;

  const torse = svgRoot.querySelector(
    '[data-membre="torse"]',
  ) as SVGGElement | null;
  if (!torse) return null;

  const g = torse.cloneNode(true) as SVGGElement;
  processLimbs(g);
  reorderBehindElements(g);
  return g;
}


type Props = {
  src: string;
  as?: "g" | "svg";
  className?: string;
  transform?: string;
  style?: CSSProperties;
  onReady?: (rootGroup: SVGGElement) => void;
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

    const injectPuppet = (puppetG: SVGGElement) => {
      const host = ref.current;
      if (!host) return;

      // Clean up previous puppet if any
      if (injectedRef.current && injectedRef.current.parentNode) {
        injectedRef.current.parentNode.removeChild(injectedRef.current);
      }

      // Append the new puppet and notify parent
      host.appendChild(puppetG);
      injectedRef.current = puppetG;
      onReadyRef.current?.(puppetG);
    }

    async function run() {
      // 1. Check cache first
      if (puppetCache.has(src)) {
        const cachedG = puppetCache.get(src)!;
        if (!cancelled) {
          injectPuppet(cachedG.cloneNode(true) as SVGGElement);
        }
        return;
      }

      // 2. If not in cache, fetch and process
      try {
        const res = await fetch(src);
        const txt = await res.text();
        if (cancelled) return;

        const processedG = processSvgText(txt);
        if (processedG) {
          // 3. Store in cache
          puppetCache.set(src, processedG);
          if (!cancelled) {
            injectPuppet(processedG.cloneNode(true) as SVGGElement);
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
