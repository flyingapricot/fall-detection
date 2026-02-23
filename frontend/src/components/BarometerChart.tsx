import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { SensorReading } from "../types/sensor";

const WINDOW_SECS = 30;
const COLOR = "#06b6d4"; // cyan

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("en-US", { hour12: false });
}

export default function BarometerChart({ readings }: { readings: SensorReading[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  // Create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const opts: uPlot.Options = {
      width: el.clientWidth,
      height: 160,
      cursor: { show: false },
      legend: { show: false },
      axes: [
        {
          stroke: "#6b7280",
          grid: { stroke: "#1f2937" },
          ticks: { stroke: "#374151" },
          values: (_u, splits) => splits.map((s) => fmtTime(s)),
        },
        {
          stroke: "#6b7280",
          grid: { stroke: "#1f2937" },
          ticks: { stroke: "#374151" },
          values: (_u, splits) => splits.map((s) => s.toFixed(1) + " hPa"),
          size: 70,
        },
      ],
      series: [
        {},
        { stroke: COLOR, width: 1.5, fill: COLOR + "18" },
      ],
    };

    const chart = new uPlot(opts, [[], []], el);
    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) chart.setSize({ width: w, height: 160 });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  // Update data
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || readings.length === 0) return;

    const nowSecs = Date.now() / 1000;
    const windowStart = nowSecs - WINDOW_SECS;
    const windowed = readings.filter((r) => r.timestamp / 1000 >= windowStart);

    const ts = windowed.map((r) => r.timestamp / 1000);
    const baro = windowed.map((r) => r.barometer);

    chart.setData([ts, baro]);
    chart.setScale("x", { min: windowStart, max: nowSecs + 3 });
  }, [readings]);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">
          Barometer
          <span className="ml-1.5 text-xs text-gray-500">(hPa)</span>
        </h3>
        {latest ? (
          <span className="font-mono text-xs text-cyan-400">
            {latest.barometer.toFixed(2)} hPa
          </span>
        ) : (
          <span className="text-xs text-gray-600">Waiting for data...</span>
        )}
      </div>
      <div ref={containerRef} />
    </div>
  );
}
