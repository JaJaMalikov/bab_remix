import React from "react";

interface MemberEditorProps {
  /** La liste des membres (membres) du pantin sélectionné. */
  limbList: { id: string; name: string }[];
  /** L'ID du membre actuellement sélectionné. */
  selectedLimb: string | null;
  /** Callback appelé lorsqu'un membre est sélectionné dans la liste. */
  onSelectLimb: (limbId: string) => void;
}

export const MemberEditor: React.FC<MemberEditorProps> = ({
  limbList,
  selectedLimb,
  onSelectLimb,
}) => {
  if (limbList.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium uppercase text-muted-foreground">Member</span>
      <select
        value={selectedLimb || ""}
        onChange={(e) => onSelectLimb(e.target.value)}
        className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
      >
        <option value="">-- Select member --</option>
        {limbList.map((limb) => (
          <option key={limb.id} value={limb.id}>
            {limb.name}
          </option>
        ))}
      </select>
    </div>
  );
};
