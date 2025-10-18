import { type ReactNode } from "react";

interface SidePanelProps {
  title?: string;
  children: ReactNode;
}

export function SidePanel({ title, children }: SidePanelProps) {
  return (
    <aside className="absolute left-0 top-0 z-10 flex h-full w-56 flex-col border-r border-border bg-background shadow-lg">
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
