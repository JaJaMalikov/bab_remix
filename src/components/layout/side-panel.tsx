import { type ReactNode } from "react";

import { Card } from "../ui/card";

interface SidePanelProps {
  title: string;
  children: ReactNode;
}

export function SidePanel({ title, children }: SidePanelProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-l border-border bg-muted/10">
      <div className="border-b border-border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      <Card className="m-3 flex-1 overflow-hidden bg-background/60">
        <div className="panel-scroll h-full px-3 py-3 text-xs text-foreground">
          {children}
        </div>
      </Card>
    </aside>
  );
}
