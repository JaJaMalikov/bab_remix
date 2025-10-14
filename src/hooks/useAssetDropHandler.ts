import { useCallback } from 'react';
import type { Asset } from '../components/AssetItem';
import type { SceneItem } from '../context/UiContext';

// Helper: Generate unique item ID
const generateItemId = () => `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

// Helper: Parse SVG dimensions from attributes or viewBox
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

// Helper: Create SVG object element
const createSvgObject = async (path: string, x: number, y: number) => {
  const response = await fetch(path);
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
  svg.setAttribute('x', String(Math.round(x - width / 2)));
  svg.setAttribute('y', String(Math.round(y - height / 2)));

  if (!svg.hasAttribute('viewBox')) {
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  svg.setAttribute('preserveAspectRatio', svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet');
  svg.setAttribute('data-draggable', 'true');
  svg.setAttribute('data-source', path);
  svg.style.cursor = 'move';

  const id = generateItemId();
  svg.setAttribute('data-id', id);

  return { svg, id };
};

// Helper: Create raster image element
const createRasterImage = async (path: string, x: number, y: number) => {
  const preload = new Image();
  const dim = await new Promise<{ w: number; h: number }>((resolve, reject) => {
    preload.onload = () => resolve({ w: preload.naturalWidth, h: preload.naturalHeight });
    preload.onerror = reject;
    preload.src = path;
  });

  const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  img.setAttribute('href', path);
  img.setAttribute('width', String(dim.w));
  img.setAttribute('height', String(dim.h));
  img.setAttribute('x', String(Math.round(x - dim.w / 2)));
  img.setAttribute('y', String(Math.round(y - dim.h / 2)));
  img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  img.setAttribute('data-draggable', 'true');
  img.setAttribute('data-source', path);
  img.style.cursor = 'move';

  const id = generateItemId();
  img.setAttribute('data-id', id);

  return { img, id };
};

interface DropHandlerArgs {
  addSceneItem: (item: SceneItem) => void;
  initializeVisibilityForItem: (itemId: string) => void;
  setPuppets: React.Dispatch<React.SetStateAction<any[]>>;
  setDecor: (href: string) => Promise<void>;
  ensureContainers: () => { viewport: SVGGElement; scene: SVGGElement };
}

export const useAssetDropHandler = ({
  addSceneItem,
  initializeVisibilityForItem,
  setPuppets,
  setDecor,
  ensureContainers,
}: DropHandlerArgs) => {
  const dropAsset = useCallback(
    async (asset: Asset, x: number, y: number) => {
      const { scene } = ensureContainers();

      if (asset.type === 'decor') {
        await setDecor(asset.path);
        return;
      }

      if (asset.type === 'pantin') {
        const anchor = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        anchor.setAttribute('transform', `translate(${Math.round(x)}, ${Math.round(y)})`);
        anchor.setAttribute('data-anchor', 'puppet');
        anchor.setAttribute('data-source', asset.path);
        anchor.style.cursor = 'move';

        const id = generateItemId();
        anchor.setAttribute('data-id', id);

        scene.appendChild(anchor);
        setPuppets((prev) => [...prev, { id, src: asset.path, anchor, dropX: x, dropY: y }]);
        addSceneItem({ id, type: 'puppet', label: asset.name || asset.path.split('/').pop() || 'Puppet', el: anchor });
        initializeVisibilityForItem(id);
        return;
      }

      if (asset.type === 'objet') {
        try {
          const { svg, id } = await createSvgObject(asset.path, x, y);
          scene.appendChild(svg);
          addSceneItem({ id, type: 'image', label: asset.name || asset.path.split('/').pop() || 'Objet', el: svg });
          initializeVisibilityForItem(id);
        } catch (error) {
          console.error('Failed to import SVG asset', error);
        }
        return;
      }

      // Default: raster image
      const { img, id } = await createRasterImage(asset.path, x, y);
      scene.appendChild(img);
      addSceneItem({ id, type: 'image', label: asset.name || asset.path.split('/').pop() || 'Image', el: img });
      initializeVisibilityForItem(id);
    },
    [addSceneItem, initializeVisibilityForItem, setDecor, setPuppets, ensureContainers],
  );

  return { dropAsset };
};
