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

      {showLibrary && <Library />}
      {showInspector && <Inspector />}
      {showLayers && <Layers />}

      <div className="main-content">
        <SvgScene />
      </div>

      {showTimeline ? <Timeline /> : <PlaybackMini />}
    </div>
  );
}
