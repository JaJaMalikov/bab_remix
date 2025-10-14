import { useEffect } from 'react';
import type { SceneItem } from '../context/UiContext';
import { setImageTransform } from '../utils/svgTransform';

const parseSvgDimensions = (svg: SVGSVGElement): { width: number; height: number } => {
  let width = parseFloat(svg.getAttribute('width') || '');
  let height = parseFloat(svg.getAttribute('height') || '');
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map(n => parseFloat(n));
      if (parts.length === 4 && parts.every(n => Number.isFinite(n))) {
        width = parts[2];
        height = parts[3];
      }
    }
  }
  return {
    width: Number.isFinite(width) && width > 0 ? width : 100,
    height: Number.isFinite(height) && height > 0 ? height : 100,
  };
};

interface ProjectLoaderArgs {
  sceneItems: SceneItem[];
  addSceneItem: (item: SceneItem) => void;
  setPuppets: React.Dispatch<React.SetStateAction<any[]>>;
  setDecor: (href: string) => Promise<void>;
  ensureContainers: () => { scene: SVGGElement };
}

export const useProjectLoader = ({
  sceneItems,
  addSceneItem,
  setPuppets,
  setDecor,
  ensureContainers,
}: ProjectLoaderArgs) => {
  useEffect(() => {
    const handleProjectLoad = async (e: Event) => {
      const projectData = (e as CustomEvent).detail;

      sceneItems.forEach((item) => {
        if (item.el.parentNode) {
          item.el.parentNode.removeChild(item.el);
        }
      });
      setPuppets([]);

      if (projectData.scene.background) {
        await setDecor(projectData.scene.background);
      }

      const { scene } = ensureContainers();

      for (const itemData of projectData.scene.items) {
        if (itemData.type === 'puppet') {
          const anchor = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          anchor.setAttribute('transform', `translate(${itemData.transform.x}, ${itemData.transform.y})`);
          anchor.setAttribute('data-anchor', 'puppet');
          anchor.setAttribute('data-source', itemData.source);
          anchor.setAttribute('data-id', itemData.id);
          anchor.style.cursor = 'move';
          scene.appendChild(anchor);

          setPuppets((prev) => [
            ...prev,
            {
              id: itemData.id,
              src: itemData.source,
              anchor,
              dropX: itemData.transform.x,
              dropY: itemData.transform.y,
            },
          ]);

          addSceneItem({
            id: itemData.id,
            type: 'puppet',
            label: itemData.label,
            el: anchor,
          });
        } else {
          const isSvgAsset = itemData.source.toLowerCase().endsWith('.svg');
          if (isSvgAsset) {
            try {
              const response = await fetch(itemData.source);
              const svgText = await response.text();
              const parser = new DOMParser();
              const doc = parser.parseFromString(svgText, 'image/svg+xml');
              const root = doc.documentElement;
              if (!(root instanceof SVGSVGElement)) {
                throw new Error('Asset root is not an SVG element');
              }
              const svg = root.cloneNode(true) as SVGSVGElement;
              const { width, height } = parseSvgDimensions(svg);

              svg.setAttribute('width', String(width));
              svg.setAttribute('height', String(height));
              svg.setAttribute('x', String(itemData.transform.x));
              svg.setAttribute('y', String(itemData.transform.y));
              if (!svg.hasAttribute('viewBox')) {
                svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
              }
              svg.setAttribute('preserveAspectRatio', svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet');
              svg.setAttribute('data-draggable', 'true');
              svg.setAttribute('data-id', itemData.id);
              svg.setAttribute('data-source', itemData.source);
              svg.style.cursor = 'move';

              const rotation = itemData.transform.rotation || 0;
              const scaleX = itemData.transform.scaleX || 1;
              const scaleY = itemData.transform.scaleY || 1;
              setImageTransform(svg, rotation, scaleX, scaleY);

              scene.appendChild(svg);
              addSceneItem({ id: itemData.id, type: 'image', label: itemData.label, el: svg });
            } catch (error) {
              console.error('Failed to load SVG object', error);
            }
          } else {
            const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            img.setAttribute('href', itemData.source);

            const preload = new Image();
            await new Promise((resolve) => {
              preload.onload = resolve;
              preload.onerror = resolve;
              preload.src = itemData.source;
            });

            const w = preload.naturalWidth || 100;
            const h = preload.naturalHeight || 100;

            img.setAttribute('width', String(w));
            img.setAttribute('height', String(h));
            img.setAttribute('x', String(itemData.transform.x));
            img.setAttribute('y', String(itemData.transform.y));
            img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            img.setAttribute('data-draggable', 'true');
            img.setAttribute('data-id', itemData.id);
            img.setAttribute('data-source', itemData.source);
            img.style.cursor = 'move';

            const rotation = itemData.transform.rotation || 0;
            const scaleX = itemData.transform.scaleX || 1;
            const scaleY = itemData.transform.scaleY || 1;

            setImageTransform(img, rotation, scaleX, scaleY);

            scene.appendChild(img);
            addSceneItem({ id: itemData.id, type: 'image', label: itemData.label, el: img });
          }
        }
      }
       window.dispatchEvent(new CustomEvent("animation:refresh"));
    };

    window.addEventListener('project:load', handleProjectLoad);
    return () => window.removeEventListener('project:load', handleProjectLoad);
  }, [sceneItems, addSceneItem, setPuppets, setDecor, ensureContainers]);
};