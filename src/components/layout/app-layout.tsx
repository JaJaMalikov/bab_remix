import { PropsWithChildren } from "react";

import { Sidebar } from "./sidebar";

interface AppLayoutProps extends PropsWithChildren {
  sidePanel?: React.ReactNode;
  timeline?: React.ReactNode;
  menubar: React.ReactNode;
}

export function AppLayout({
  children,
  sidePanel,
  timeline,
  menubar,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-muted/40">{menubar}</header>
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 overflow-hidden bg-muted/10">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 p-4">
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
                  {children}
                </div>
              </div>
            </div>
            {sidePanel}
          </div>
          {timeline}
        </main>
      </div>
    </div>
  );
}
