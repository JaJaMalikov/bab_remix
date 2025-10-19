import React from "react";
import type { SceneItem } from "../../context/UiContext";

interface AttachmentEditorProps {
  /** L'élément de la scène actuellement sélectionné (doit être une image). */
  selectedItem: SceneItem;
  /** La liste de tous les éléments de la scène, pour trouver les pantins cibles. */
  sceneItems: SceneItem[];
  /** Callback pour attacher l'image à un membre de pantin. */
  handleAttachToMember: (targetValue: string) => void;
  /** Callback pour détacher l'image du membre auquel elle est attachée. */
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
    <div className="flex flex-col gap-1.5">
      {isAttached ? (
        <>
          <div className="flex items-center gap-2 rounded border border-border bg-muted/30 px-2 py-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Attached</span>
            <span className="flex-1 text-xs text-foreground">
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
            </span>
          </div>
          <button
            type="button"
            onClick={handleDetachFromMember}
            className="rounded border border-destructive bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Detach
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase text-muted-foreground">Attach to</span>
          <select
            onChange={(event) =>
              event.target.value && handleAttachToMember(event.target.value)
            }
            defaultValue=""
            className="w-36 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
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
        </div>
      )}
    </div>
  );
};
