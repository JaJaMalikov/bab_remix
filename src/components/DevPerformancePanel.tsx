import { useState, useEffect } from "react";
import { perfMonitor } from "../utils/performanceMonitor";

interface MetricData {
  label: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

/**
 * Development-only performance monitoring panel.
 * Displays real-time performance metrics for critical operations.
 */
export function DevPerformancePanel() {
  // Only render in development
  if (!import.meta.env.DEV) return null;

  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!perfMonitor.isEnabled()) return;

    const interval = setInterval(() => {
      const labels = perfMonitor.getLabels();
      const data = labels.map((label) => ({
        label,
        avg: perfMonitor.getAverage(label),
        min: perfMonitor.getMin(label),
        max: perfMonitor.getMax(label),
        count: perfMonitor.getRecent(label, 100).length,
      }));
      setMetrics(data);
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut to toggle visibility (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isVisible) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 10,
          right: 10,
          background: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "4px 8px",
          borderRadius: 4,
          fontSize: 10,
          fontFamily: "monospace",
          cursor: "pointer",
          zIndex: 10000,
        }}
        onClick={() => setIsVisible(true)}
        title="Click or press Ctrl+Shift+P to show performance panel"
      >
        📊 Perf
      </div>
    );
  }

  const getColor = (avg: number): string => {
    if (avg < 8) return "#4CAF50"; // Green
    if (avg < 16) return "#FFC107"; // Yellow
    if (avg < 33) return "#FF9800"; // Orange
    return "#F44336"; // Red
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        background: "rgba(0, 0, 0, 0.9)",
        color: "white",
        padding: 12,
        borderRadius: 8,
        fontSize: 11,
        fontFamily: "monospace",
        minWidth: 300,
        maxHeight: "80vh",
        overflow: "auto",
        zIndex: 10000,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <strong style={{ fontSize: 12 }}>⚡ Performance Monitor</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              perfMonitor.clear();
              setMetrics([]);
            }}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white",
              padding: "2px 6px",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 10,
            }}
            title="Clear all metrics"
          >
            Clear
          </button>
          <button
            onClick={() => perfMonitor.report()}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white",
              padding: "2px 6px",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 10,
            }}
            title="Print to console"
          >
            Log
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white",
              padding: "2px 6px",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 10,
            }}
            title="Hide panel (Ctrl+Shift+P)"
          >
            ✕
          </button>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 20 }}>
          No metrics collected yet.
          <br />
          <small>Interact with the app to see performance data.</small>
        </div>
      ) : (
        <div>
          {metrics.map((metric) => (
            <div
              key={metric.label}
              style={{
                marginBottom: 8,
                padding: 6,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 4,
                borderLeft: `3px solid ${getColor(metric.avg)}`,
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: 4,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 4,
                  fontSize: 9,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <div>
                  <div>Avg</div>
                  <div style={{ color: getColor(metric.avg), fontWeight: "bold" }}>
                    {metric.avg.toFixed(2)}ms
                  </div>
                </div>
                <div>
                  <div>Min/Max</div>
                  <div>
                    {metric.min.toFixed(1)} / {metric.max.toFixed(1)}ms
                  </div>
                </div>
                <div>
                  <div>Samples</div>
                  <div>{metric.count}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: "1px solid rgba(255,255,255,0.2)",
          fontSize: 9,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        Target: &lt;16ms (60fps) | &lt;33ms (30fps)
        <br />
        Press Ctrl+Shift+P to toggle panel
      </div>
    </div>
  );
}
