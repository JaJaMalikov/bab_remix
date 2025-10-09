import { memo, useCallback } from 'react';
import { useUi } from '../context/UiContext';
import type { UiState } from '../context/UiContext';

// Define the props for the component, using the type from UiState
interface LayerItemProps {
  item: UiState['sceneItems'][0];
}

/**
 * A memoized component representing a single item in the Layers panel.
 * It uses useCallback for its event handlers to prevent unnecessary re-renders.
 */
export const LayerItem = memo(({ item }: LayerItemProps) => {
  const { bringForward, sendBackward, setSelectedPuppet } = useUi();

  // Memoize the callbacks to prevent re-creation
  const handleSendBackward = useCallback(() => {
    sendBackward(item.id);
  }, [sendBackward, item.id]);

  const handleBringForward = useCallback(() => {
    bringForward(item.id);
  }, [bringForward, item.id]);

  const handleSelect = useCallback(() => {
    if (item.el instanceof SVGGElement) {
      const root = (item.el.firstElementChild instanceof SVGGElement
        ? item.el.firstElementChild
        : item.el) as SVGGElement;
      setSelectedPuppet(root);
    }
  }, [setSelectedPuppet, item.el]);

  return (
    <div className="layer-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </div>
      <button onClick={handleSendBackward} title="Send backward">↓</button>
      <button onClick={handleBringForward} title="Bring forward">↑</button>
      {item.el instanceof SVGGElement && (
        <button onClick={handleSelect}>Select</button>
      )}
    </div>
  );
});
