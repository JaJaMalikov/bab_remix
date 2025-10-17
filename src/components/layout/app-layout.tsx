import { PropsWithChildren } from "react";

import { Sidebar } from "./sidebar";

interface AppLayoutProps extends PropsWithChildren {
  sidePanel?: React.ReactNode;
  timeline?: React.ReactNode;
}

export function AppLayout({
  children,
  sidePanel,
  timeline,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden bg-muted/10">
            <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-card">
              {children}
            </div>
            {sidePanel}
          </div>
          {timeline}
        </main>
      </div>
    </div>
  );
}
