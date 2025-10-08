import { SvgScene } from "./components/SvgScene";
import { Library } from "./components/Library";
import { Inspector } from "./components/Inspector";
import { Timeline } from "./components/Timeline";
import { UiProvider } from "./context/UiContext";

export default function App() {
  return (
    <UiProvider>
      <div className="app">
        <Library />
        <div className="main-content">
          <SvgScene />
        </div>
        <Inspector />
        <Timeline />
      </div>
    </UiProvider>
  );
}
