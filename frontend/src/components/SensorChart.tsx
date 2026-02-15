import { useEffect, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { SensorReading } from "../types/sensor";

type ChartType = "accel" | "gyro";

const COLORS = { x: "#6366f1", y: "#10b981", z: "#f59e0b" }; // indigo, emerald, amber
const LABELS: Record<ChartType, Record<string, string>> = {
  accel: { x: "Accel X", y: "Accel Y", z: "Accel Z" },
  gyro: { x: "Gyro X", y: "Gyro Y", z: "Gyro Z" },
};

function getFields(type: ChartType): [keyof SensorReading, keyof SensorReading, keyof SensorReading] {
  return type === "accel"
    ? ["accelX", "accelY", "accelZ"]
    : ["gyroX", "gyroY", "gyroZ"];
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

  // Create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const opts: uPlot.Options = {
      width: el.clientWidth,
      height: 220,
      cursor: { show: false },
      legend: { show: false },
      axes: [
        { stroke: "#6b7280", grid: { stroke: "#1f2937" }, ticks: { stroke: "#374151" } },
        { stroke: "#6b7280", grid: { stroke: "#1f2937" }, ticks: { stroke: "#374151" } },
      ],
      series: [
        {},
        { label: LABELS[type].x, stroke: COLORS.x, width: 1.5 },
        { label: LABELS[type].y, stroke: COLORS.y, width: 1.5 },
        { label: LABELS[type].z, stroke: COLORS.z, width: 1.5 },
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
        <h3 className="text-sm font-medium text-gray-300">
          {type === "accel" ? "Accelerometer" : "Gyroscope"}
        </h3>
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
      <div ref={containerRef} />
    </div>
  );
}
