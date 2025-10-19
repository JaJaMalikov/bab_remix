import { SvgScene } from "./components/SvgScene";
import { Inspector } from "./components/Inspector";
import { Timeline } from "./components/Timeline";
import { UiProvider, useUi } from "./context/UiContext";
import { AnimationProvider } from "./context/AnimationContext";
import { Layers } from "./components/Layers";
import { PlaybackMini } from "./components/PlaybackMini";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppLayout } from "./components/layout/app-layout";
import { SidePanel } from "./components/layout/side-panel";
import { LibraryPanel } from "./components/features/library-panel";
import { Theme } from "@radix-ui/themes";

export default function App() {
  return (
    <Theme appearance="dark" accentColor="red" grayColor="sage">
      <UiProvider>
        <AnimationProvider>
          <RootShell />
        </AnimationProvider>
      </UiProvider>
    </Theme>
  );
}

function RootShell() {
  const { showLibrary, showInspector, showLayers, showTimeline } = useUi();
  useKeyboardShortcuts();

  const activePanel = showLibrary
    ? "library"
    : showInspector
      ? "inspector"
      : showLayers
        ? "layers"
        : null;

  const panelContent = (() => {
    switch (activePanel) {
      case "library":
        return <LibraryPanel />;
      case "inspector":
        return <Inspector />;
      case "layers":
        return <Layers />;
      default:
        return null;
    }
  })();

  const sidePanel = panelContent ? (
    <SidePanel
      title={
        activePanel === "layers"
          ? "Layers"
          : undefined
      }
    >
      {panelContent}
    </SidePanel>
  ) : undefined;

  const timelineArea = (
    <div className="border-t border-border bg-muted/20">
      {showTimeline ? (
        <ErrorBoundary message="La timeline ne peut pas être rendue.">
          <Timeline />
        </ErrorBoundary>
      ) : (
        <div className="px-6 py-3">
          <ErrorBoundary message="Le module de lecture a rencontré une erreur.">
            <PlaybackMini />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout sidePanel={sidePanel} timeline={timelineArea}>
      <ErrorBoundary message="La scène SVG est temporairement indisponible.">
        <SvgScene />
      </ErrorBoundary>
    </AppLayout>
  );
}
