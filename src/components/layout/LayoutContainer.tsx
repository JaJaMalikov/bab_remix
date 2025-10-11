import { ReactNode } from "react";
import { useUi } from "../../context/UiContext";

interface LayoutContainerProps {
  topBar: ReactNode;
  leftSidebar: ReactNode;
  rightSidebar: ReactNode;
  canvas: ReactNode;
  timeline: ReactNode;
}

export function LayoutContainer({
  topBar,
  leftSidebar,
  rightSidebar,
  canvas,
  timeline,
}: LayoutContainerProps) {
  const { showLibrary, showInspector, showTimeline } = useUi();

  return (
    <div className="app-layout">
      {/* Top Bar */}
      <div className="topbar-area">{topBar}</div>

      {/* Main Content Area */}
      <div className="main-area">
        {/* Left Sidebar */}
        {showLibrary && (
          <div className="sidebar-left">{leftSidebar}</div>
        )}

        {/* Canvas */}
        <div className="canvas-area">{canvas}</div>

        {/* Right Sidebar */}
        {showInspector && (
          <div className="sidebar-right">{rightSidebar}</div>
        )}
      </div>

      {/* Timeline */}
      {showTimeline && <div className="timeline-area">{timeline}</div>}
    </div>
  );
}
