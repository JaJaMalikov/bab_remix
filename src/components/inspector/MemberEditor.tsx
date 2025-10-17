import React from "react";

interface MemberEditorProps {
  limbList: { id: string; name: string }[];
  selectedLimb: string | null;
  onSelectLimb: (limbId: string) => void;
}

export const MemberEditor: React.FC<MemberEditorProps> = ({
  limbList,
  selectedLimb,
  onSelectLimb,
}) => {
  if (limbList.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-foreground">
        Members ({limbList.length})
      </h4>
      <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
        {limbList.map((limb) => {
          const selected = limb.id === selectedLimb;
          return (
            <button
              key={limb.id}
              type="button"
              onClick={() => onSelectLimb(limb.id)}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/40 text-foreground hover:border-primary/40"}`}
            >
              <span className="truncate">{limb.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
