import { Button } from "../ui/button";
import React from "react";
import type { SceneItem } from "../../context/UiContext";

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
    <section className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-foreground">Attachment</h4>
      {isAttached ? (
        <>
          <div className="text-xs text-muted-foreground">
            Attached to:{" "}
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
          <Button
            type="button"
            onClick={handleDetachFromMember}
            variant="destructive"
            className="w-full"
          >
            Detach from Member
          </Button>
        </>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            Select a puppet member to attach this image to
          </div>
          <select
            onChange={(event) =>
              event.target.value && handleAttachToMember(event.target.value)
            }
            defaultValue=""
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
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
    </section>
  );
};
