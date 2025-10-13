import { SvgScene } from "./components/SvgScene";
import { Library } from "./components/Library";
import { Inspector } from "./components/Inspector";
import { Timeline } from "./components/Timeline";
import { UiProvider, useUi } from "./context/UiContext";
import { AnimationProvider } from "./context/AnimationContext";
import { MenuBar } from "./components/MenuBar";
import { Layers } from "./components/Layers";
import { PlaybackMini } from "./components/PlaybackMini";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <UiProvider>
      <AnimationProvider>
        <AppLayout />
      </AnimationProvider>
    </UiProvider>
  );
}

function AppLayout() {
  const { showLibrary, showInspector, showLayers, showTimeline } = useUi();
  useKeyboardShortcuts();

  return (
    <div className="app">
      <MenuBar />

      {showLibrary && (
        <ErrorBoundary message="La bibliothèque des assets ne peut pas être affichée.">
          <Library />
        </ErrorBoundary>
      )}
      {showInspector && (
        <ErrorBoundary message="L'inspecteur a rencontré un problème inattendu.">
          <Inspector />
        </ErrorBoundary>
      )}
      {showLayers && (
        <ErrorBoundary message="Les calques n'ont pas pu être chargés.">
          <Layers />
        </ErrorBoundary>
      )}

      <div className="main-content">
        <ErrorBoundary message="La scène SVG est temporairement indisponible.">
          <SvgScene />
        </ErrorBoundary>
      </div>

      {showTimeline ? (
        <ErrorBoundary message="La timeline ne peut pas être rendue.">
          <Timeline />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary message="Le module de lecture a rencontré une erreur.">
          <PlaybackMini />
        </ErrorBoundary>
      )}
    </div>
  );
}
