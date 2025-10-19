/**
 * Performance monitoring utilities for tracking render times and frame rates.
 * Only active in development mode.
 */

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private enabled: boolean;

  constructor() {
    this.enabled = import.meta.env.DEV;
  }

  /**
   * Start measuring performance for a given label.
   * @param label Unique identifier for this measurement
   */
  startMeasure(label: string): void {
    if (!this.enabled) return;
    performance.mark(`${label}-start`);
  }

  /**
   * End measuring performance for a given label and store the result.
   * @param label Same identifier used in startMeasure
   */
  endMeasure(label: string): void {
    if (!this.enabled) return;

    try {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);

      const measures = performance.getEntriesByName(label);
      if (measures.length === 0) return;

      const measure = measures[measures.length - 1];
      const times = this.metrics.get(label) ?? [];
      times.push(measure.duration);

      // Keep only last 100 measurements
      if (times.length > 100) times.shift();
      this.metrics.set(label, times);

      // Clean up marks and measures
      performance.clearMarks(`${label}-start`);
      performance.clearMarks(`${label}-end`);
      performance.clearMeasures(label);
    } catch (error) {
      console.warn(`Performance measurement failed for ${label}:`, error);
    }
  }

  /**
   * Get average duration for a given label.
   * @param label Measurement identifier
   * @returns Average duration in milliseconds, or 0 if no data
   */
  getAverage(label: string): number {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  /**
   * Get minimum duration for a given label.
   * @param label Measurement identifier
   * @returns Minimum duration in milliseconds, or 0 if no data
   */
  getMin(label: string): number {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return 0;
    return Math.min(...times);
  }

  /**
   * Get maximum duration for a given label.
   * @param label Measurement identifier
   * @returns Maximum duration in milliseconds, or 0 if no data
   */
  getMax(label: string): number {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return 0;
    return Math.max(...times);
  }

  /**
   * Get the last N measurements for a given label.
   * @param label Measurement identifier
   * @param count Number of recent measurements to retrieve (default: 10)
   * @returns Array of recent durations
   */
  getRecent(label: string, count = 10): number[] {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return [];
    return times.slice(-count);
  }

  /**
   * Print a formatted report of all metrics to the console.
   */
  report(): void {
    if (!this.enabled) {
      console.log("Performance monitoring is disabled in production.");
      return;
    }

    const data = Array.from(this.metrics.entries()).map(([label, times]) => ({
      Label: label,
      "Count": times.length,
      "Avg (ms)": this.getAverage(label).toFixed(2),
      "Min (ms)": this.getMin(label).toFixed(2),
      "Max (ms)": this.getMax(label).toFixed(2),
      "Status": this.getStatus(label),
    }));

    if (data.length === 0) {
      console.log("No performance data collected yet.");
      return;
    }

    console.table(data);
  }

  /**
   * Get performance status based on average duration.
   * @param label Measurement identifier
   * @returns Status string with emoji
   */
  private getStatus(label: string): string {
    const avg = this.getAverage(label);

    // Frame budget: 16.67ms for 60fps, 33.33ms for 30fps
    if (avg < 8) return "🟢 Excellent";
    if (avg < 16) return "🟡 Good";
    if (avg < 33) return "🟠 Acceptable";
    return "🔴 Slow";
  }

  /**
   * Clear all stored metrics.
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get all metric labels currently being tracked.
   * @returns Array of label names
   */
  getLabels(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Check if monitoring is enabled.
   * @returns true if in development mode
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const perfMonitor = new PerformanceMonitor();

// Expose to window for debugging in dev mode
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as any).perfMonitor = perfMonitor;
  console.log(
    "%c[Performance Monitor] Available at window.perfMonitor",
    "color: #4CAF50; font-weight: bold"
  );
  console.log(
    "%cUse perfMonitor.report() to view performance metrics",
    "color: #4CAF50"
  );
}
