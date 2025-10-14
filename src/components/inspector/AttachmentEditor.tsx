import React from 'react';
import type { SceneItem } from '../../context/UiContext';

interface AttachmentEditorProps {
  selectedItem: SceneItem;
  sceneItems: SceneItem[];
  handleAttachToMember: (targetValue: string) => void;
  handleDetachFromMember: () => void;
}

export const AttachmentEditor: React.FC<AttachmentEditorProps> = ({
  selectedItem,
  sceneItems,
  handleAttachToMember,
  handleDetachFromMember,
}) => {
  if (selectedItem.type !== 'image') return null;

  const imageEl = selectedItem.el as SVGGraphicsElement;
  const isAttached = imageEl.hasAttribute('data-attached-to-puppet');
  const attachedPuppetId = imageEl.getAttribute('data-attached-to-puppet');
  const attachedMemberId = imageEl.getAttribute('data-attached-to-member');

  return (
    <div className="property-group">
      <h4>Attachment</h4>
      {isAttached ? (
        <>
          <div style={{ fontSize: 11, color: '#a0a0a0', marginBottom: 8 }}>
            Attached to:{' '}
            {(() => {
              const puppet = sceneItems.find((p) => p.id === attachedPuppetId);
              if (!puppet) return 'Unknown';
              const puppetRoot = (puppet.el as SVGGElement).firstChild as SVGGElement | null;
              if (!puppetRoot) return 'Unknown';
              const member = puppetRoot.querySelector(
                `#${CSS.escape(attachedMemberId || '')}`,
              ) as SVGGElement | null;
              const memberName = member?.id || attachedMemberId;
              return `${puppet.label} › ${memberName}`;
            })()}
          </div>
          <button
            onClick={handleDetachFromMember}
            style={{
              width: '100%',
              padding: 8,
              background: '#ff9800',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Detach from Member
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11, color: '#a0a0a0', marginBottom: 8 }}>
            Select a puppet member to attach this image to
          </div>
          <select
            onChange={(e) => e.target.value && handleAttachToMember(e.target.value)}
            defaultValue=""
            style={{ width: '100%', padding: '6px 8px', fontSize: 11, marginBottom: 8 }}
          >
            <option value="">-- Select member --</option>
            {sceneItems
              .filter((item) => item.type === 'puppet')
              .map((puppet) => {
                const anchor = puppet.el;
                const puppetRoot = anchor.firstChild as SVGGElement | null;
                if (!puppetRoot) return null;
                const members = puppetRoot.querySelectorAll('[data-membre]');
                return Array.from(members).map((member) => {
                  const name = member.id;
                  return (
                    <option key={`${puppet.id}:${member.id}`} value={`${puppet.id}:${member.id}`}>
                      {puppet.label} › {name}
                    </option>
                  );
                });
              })
              .flat()
              .filter(Boolean)}
          </select>
        </>
      )}
    </div>
  );
};
