import { type ReactNode } from "react";

interface SidePanelProps {
  title?: string;
  children: ReactNode;
}

export function SidePanel({ title, children }: SidePanelProps) {
  return (
    <aside className="flex h-full w-56 flex-col border-l border-border bg-muted/10">
      {title && (
        <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
          {title}
        </div>
      )}
      <div className="flex-1 overflow-hidden p-3">
        {children}
      </div>
    </aside>
  );
}
