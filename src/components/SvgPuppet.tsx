import { useEffect, useRef } from "react";
import type { CSSProperties, RefObject } from "react";

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
    async function run() {
      const res = await fetch(src);
      const txt = await res.text();
      if (cancelled) return;
      const parser = new DOMParser();
      const doc = parser.parseFromString(txt, "image/svg+xml");
      const svgRoot = doc.documentElement as unknown as SVGSVGElement;

      const torse = svgRoot.querySelector(
        '[data-membre="torse"]',
      ) as SVGGElement | null;
      if (!torse) return;
      const g = torse.cloneNode(true) as SVGGElement;

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
      // Applique aussi au torse si lui-même a un data-pivot
      if (g.hasAttribute("data-pivot")) {
        const attr = g.getAttribute("data-pivot");
        if (attr) {
          const [sxStr, syStr] = attr.split(",");
          const sx = parseFloat((sxStr || "").trim());
          const sy = parseFloat((syStr || "").trim());
          if (isFinite(sx) && isFinite(sy)) {
            (g.style as any).transformBox = "view-box";
            g.style.transformOrigin = `${sx}px ${sy}px`;
          }
        }
      }

      const behind = Array.from(
        g.querySelectorAll('[data-isbehindparent="true"]') as NodeListOf<SVGGElement>,
      );
      for (let i = behind.length - 1; i >= 0; i--) {
        const el = behind[i]!;
        const parent = el.parentNode;
        if (!parent) continue;
        if (parent.firstChild !== el) parent.insertBefore(el, parent.firstChild);
      }

      const host = ref.current;
      if (!host) return;
      if (injectedRef.current && injectedRef.current.parentNode) {
        injectedRef.current.parentNode.removeChild(injectedRef.current);
      }
      host.appendChild(g);
      injectedRef.current = g;
      onReadyRef.current?.(g);
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
