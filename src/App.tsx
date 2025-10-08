import { SvgScene } from "./components/SvgScene";
import { Library } from "./components/Library";
import { Inspector } from "./components/Inspector";
import { Timeline } from "./components/Timeline";
import { UiProvider, useUi } from "./context/UiContext";
import { Toolbar } from "./components/Toolbar";
import { Layers } from "./components/Layers";
import { PlaybackMini } from "./components/PlaybackMini";

export default function App() {
  return (
    <UiProvider>
      <AppLayout />
    </UiProvider>
  );
}

function AppLayout() {
  const { showLibrary, showInspector, showLayers, showTimeline } = useUi();
  return (
    <div className="app">
      {/* floating panels */}
      {showLibrary && <Library />}
      {showInspector && <Inspector />}
      {showLayers && <Layers />}

      {/* main scene area */}
      <div className="main-content">
        <SvgScene />
      </div>

      {/* toolbar always on top */}
      <Toolbar />

      {/* docked bottom timeline or mini playback */}
      {showTimeline ? <Timeline /> : <PlaybackMini />}
    </div>
  );
}
