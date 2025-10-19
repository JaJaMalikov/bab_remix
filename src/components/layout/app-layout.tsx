import { PropsWithChildren } from "react";

import { Sidebar } from "./sidebar";
import { Toaster } from "../ui/toaster";

interface AppLayoutProps extends PropsWithChildren {
  /**
   * Slot pour le panneau latéral droit (ex: Inspecteur, Bibliothèque).
   */
  sidePanel?: React.ReactNode;
  /**
   * Slot pour la timeline en bas de l'écran.
   */
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
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/10">
            <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-card">
              {children}
            </div>
            {sidePanel}
          </div>
          {timeline}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
