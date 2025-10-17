import { type ReactNode } from "react";

import { Card } from "../ui/card";

interface SidePanelProps {
  title: string;
  children: ReactNode;
}

export function SidePanel({ title, children }: SidePanelProps) {
  return (
    <aside className="flex h-full w-96 flex-col border-l border-border bg-muted/10">
      <div className="border-b border-border p-4 text-lg font-semibold text-foreground">
        {title}
      </div>
      <Card className="m-4 flex-1 overflow-hidden bg-background/60">
        <div className="panel-scroll h-full px-4 py-3">{children}</div>
      </Card>
    </aside>
  );
}
