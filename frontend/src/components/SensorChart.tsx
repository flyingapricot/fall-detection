import { useEffect, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { SensorReading } from "../types/sensor";

type ChartType = "accel" | "gyro";

const COLORS = { x: "#6366f1", y: "#10b981", z: "#f59e0b" }; // indigo, emerald, amber

const TITLES: Record<ChartType, string> = {
  accel: "Accelerometer",
  gyro: "Gyroscope",
};

const UNITS: Record<ChartType, string> = {
  accel: "m/s²",
  gyro: "°/s",
};

function getFields(type: ChartType): [keyof SensorReading, keyof SensorReading, keyof SensorReading] {
  return type === "accel"
    ? ["accelX", "accelY", "accelZ"]
    : ["gyroX", "gyroY", "gyroZ"];
}

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("en-US", { hour12: false });
}

export default function SensorChart({
  readings,
  type,
}: {
  readings: SensorReading[];
  type: ChartType;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const [visible, setVisible] = useState({ x: true, y: true, z: true });
  const fields = getFields(type);

  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  // Create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const unit = UNITS[type];

    const opts: uPlot.Options = {
      width: el.clientWidth,
      height: 220,
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
          values: (_u, splits) => splits.map((s) => s.toFixed(1) + " " + unit),
        },
      ],
      series: [
        {},
        { stroke: COLORS.x, width: 1.5 },
        { stroke: COLORS.y, width: 1.5 },
        { stroke: COLORS.z, width: 1.5 },
      ],
    };

    const chart = new uPlot(opts, [[], [], [], []], el);
    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) chart.setSize({ width: w, height: 220 });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.destroy();
      chartRef.current = null;
    };
  }, [type]);

  // Update data when readings or visibility changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const ts = readings.map((r) => r.timestamp / 1000);
    const xData = readings.map((r) => (visible.x ? (r[fields[0]] as number) : null));
    const yData = readings.map((r) => (visible.y ? (r[fields[1]] as number) : null));
    const zData = readings.map((r) => (visible.z ? (r[fields[2]] as number) : null));

    chart.setData([
      ts,
      xData as (number | null)[],
      yData as (number | null)[],
      zData as (number | null)[],
    ]);
  }, [readings, visible, fields]);

  const toggle = (axis: "x" | "y" | "z") =>
    setVisible((v) => ({ ...v, [axis]: !v[axis] }));

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-300">
            {TITLES[type]}
            <span className="ml-1.5 text-xs text-gray-500">({UNITS[type]})</span>
          </h3>
        </div>
        <div className="flex gap-1.5">
          {(["x", "y", "z"] as const).map((axis) => (
            <button
              key={axis}
              onClick={() => toggle(axis)}
              className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
                visible[axis]
                  ? axis === "x"
                    ? "bg-indigo-500/20 text-indigo-400"
                    : axis === "y"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              {axis.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Latest values */}
      {latest ? (
        <div className="mb-2 flex gap-4 text-xs font-mono">
          {(["x", "y", "z"] as const).map((axis, i) => (
            <span
              key={axis}
              className={
                axis === "x"
                  ? "text-indigo-400"
                  : axis === "y"
                    ? "text-emerald-400"
                    : "text-amber-400"
              }
            >
              {axis.toUpperCase()}: {(latest[fields[i]] as number).toFixed(2)}
            </span>
          ))}
        </div>
      ) : (
        <div className="mb-2 text-xs text-gray-600">Waiting for data...</div>
      )}

      <div ref={containerRef} />
    </div>
  );
}
