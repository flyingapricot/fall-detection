import { useEffect, useMemo, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { SensorReading } from "../types/sensor";
import ChartModal from "./ChartModal";

type ChartType = "accel" | "gyro";

const COLORS = { x: "#6366f1", y: "#10b981", z: "#f59e0b" };
const WINDOW_SECS = 30;

const TITLES: Record<ChartType, string> = { accel: "Accelerometer", gyro: "Gyroscope" };
const UNITS: Record<ChartType, string> = { accel: "m/s²", gyro: "°/s" };
const AXIS_COLORS = { x: "text-indigo-400", y: "text-emerald-400", z: "text-amber-400" } as const;

function getFields(type: ChartType): [keyof SensorReading, keyof SensorReading, keyof SensorReading] {
  return type === "accel" ? ["accelX", "accelY", "accelZ"] : ["gyroX", "gyroY", "gyroZ"];
}

function fmtTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("en-US", { hour12: false });
}

function buildOpts(el: HTMLElement, unit: string, height: number): uPlot.Options {
  return {
    width: el.clientWidth, height,
    cursor: { show: false }, legend: { show: false },
    axes: [
      { stroke: "#6b7280", grid: { stroke: "#1f2937" }, ticks: { stroke: "#374151" },
        values: (_u, splits) => splits.map(fmtTime) },
      { stroke: "#6b7280", grid: { stroke: "#1f2937" }, ticks: { stroke: "#374151" },
        values: (_u, splits) => splits.map((s) => s.toFixed(1) + " " + unit), size: 75 },
    ],
    series: [
      {},
      { stroke: COLORS.x, width: 2, paths: uPlot.paths.spline?.() },
      { stroke: COLORS.y, width: 2, paths: uPlot.paths.spline?.() },
      { stroke: COLORS.z, width: 2, paths: uPlot.paths.spline?.() },
    ],
  };
}

function applyData(
  chart: uPlot,
  readings: SensorReading[],
  fields: ReturnType<typeof getFields>,
  visible: { x: boolean; y: boolean; z: boolean },
) {
  const nowSecs = Date.now() / 1000;
  const windowStart = nowSecs - WINDOW_SECS;
  const w = readings.filter((r) => r.timestamp / 1000 >= windowStart);
  chart.setData([
    w.map((r) => r.timestamp / 1000),
    w.map((r) => (visible.x ? (r[fields[0]] as number) : null)) as (number | null)[],
    w.map((r) => (visible.y ? (r[fields[1]] as number) : null)) as (number | null)[],
    w.map((r) => (visible.z ? (r[fields[2]] as number) : null)) as (number | null)[],
  ]);
  chart.setScale("x", { min: windowStart, max: nowSecs + 3 });
}

export default function SensorChart({ readings, type }: { readings: SensorReading[]; type: ChartType }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<uPlot | null>(null);
  const modalRoRef = useRef<ResizeObserver | null>(null);

  const [visible, setVisible] = useState({ x: true, y: true, z: true });
  const [isMaximized, setIsMaximized] = useState(false);

  const fields = getFields(type);
  const unit = UNITS[type];
  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  const windowStats = useMemo(() => {
    const windowStart = Date.now() - WINDOW_SECS * 1000;
    const w = readings.filter((r) => r.timestamp >= windowStart);
    if (w.length === 0) return null;
    const axisStats = (["x", "y", "z"] as const).map((_, i) => {
      const vals = w.map((r) => r[fields[i]] as number);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const min = vals.reduce((a, b) => Math.min(a, b));
      const max = vals.reduce((a, b) => Math.max(a, b));
      const stdDev = Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length);
      return { avg, min, max, stdDev };
    });
    const mags = w.map((r) =>
      Math.sqrt((r[fields[0]] as number) ** 2 + (r[fields[1]] as number) ** 2 + (r[fields[2]] as number) ** 2),
    );
    return { axisStats, peakMag: mags.reduce((a, b) => Math.max(a, b)), avgMag: mags.reduce((a, b) => a + b, 0) / mags.length, count: w.length };
  }, [readings, fields]);

  // Regular chart
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = new uPlot(buildOpts(el, unit, 220), [[], [], [], []], el);
    chartRef.current = chart;
    const ro = new ResizeObserver(([e]) => { if (e.contentRect.width > 0) chart.setSize({ width: e.contentRect.width, height: 220 }); });
    ro.observe(el);
    return () => { ro.disconnect(); chart.destroy(); chartRef.current = null; };
  }, [type, unit]);

  useEffect(() => {
    if (!chartRef.current || readings.length === 0) return;
    applyData(chartRef.current, readings, fields, visible);
  }, [readings, visible, fields]);

  // Modal chart
  useEffect(() => {
    if (!isMaximized) {
      modalRoRef.current?.disconnect(); modalRoRef.current = null;
      modalChartRef.current?.destroy(); modalChartRef.current = null;
      return;
    }
    const raf = requestAnimationFrame(() => {
      const el = modalContainerRef.current;
      if (!el) return;
      const chart = new uPlot(buildOpts(el, unit, 340), [[], [], [], []], el);
      modalChartRef.current = chart;
      const ro = new ResizeObserver(([e]) => { if (e.contentRect.width > 0) chart.setSize({ width: e.contentRect.width, height: 340 }); });
      ro.observe(el); modalRoRef.current = ro;
      if (readings.length > 0) applyData(chart, readings, fields, visible);
    });
    return () => {
      cancelAnimationFrame(raf);
      modalRoRef.current?.disconnect(); modalRoRef.current = null;
      modalChartRef.current?.destroy(); modalChartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMaximized, type, unit]);

  useEffect(() => {
    if (!isMaximized || !modalChartRef.current || readings.length === 0) return;
    applyData(modalChartRef.current, readings, fields, visible);
  }, [readings, visible, fields, isMaximized]);

  const toggle = (axis: "x" | "y" | "z") => setVisible((v) => ({ ...v, [axis]: !v[axis] }));

  const AxisToggles = () => (
    <div className="flex gap-1.5">
      {(["x", "y", "z"] as const).map((axis) => (
        <button key={axis} onClick={() => toggle(axis)}
          className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${visible[axis]
            ? axis === "x" ? "bg-indigo-500/20 text-indigo-400"
              : axis === "y" ? "bg-emerald-500/20 text-emerald-400"
              : "bg-amber-500/20 text-amber-400"
            : "bg-gray-800 text-gray-500"}`}>
          {axis.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">
            {TITLES[type]}<span className="ml-1.5 text-xs text-gray-500">({unit})</span>
          </h3>
          <div className="flex items-center gap-2">
            <AxisToggles />
            <button onClick={() => setIsMaximized(true)}
              className="rounded p-1 text-gray-600 transition-colors hover:bg-gray-800 hover:text-gray-400" title="Expand">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.28 7.78l3.22-3.22v2.69a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.69l-3.22 3.22a.75.75 0 0 0 1.06 1.06ZM2 17.25v-4.5a.75.75 0 0 1 1.5 0v2.69l3.22-3.22a.75.75 0 0 1 1.06 1.06L4.56 16.5h2.69a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
              </svg>
            </button>
          </div>
        </div>

        {latest ? (
          <div className="mb-2 flex gap-4 font-mono text-xs">
            {(["x", "y", "z"] as const).map((axis, i) => (
              <span key={axis} className={AXIS_COLORS[axis]}>
                {axis.toUpperCase()}: {(latest[fields[i]] as number).toFixed(2)}
              </span>
            ))}
          </div>
        ) : (
          <div className="mb-2 text-xs text-gray-600">Waiting for data...</div>
        )}
        <div ref={containerRef} />
      </div>

      {isMaximized && (
        <ChartModal
          title={TITLES[type]}
          subtitle={`Last ${WINDOW_SECS}s · ${windowStats?.count ?? 0} samples · ${unit}`}
          onClose={() => setIsMaximized(false)}
        >
          <div className="mb-3 flex items-center gap-3">
            <AxisToggles />
            {latest && (
              <div className="flex gap-4 font-mono text-xs">
                {(["x", "y", "z"] as const).map((axis, i) => (
                  <span key={axis} className={AXIS_COLORS[axis]}>
                    {axis.toUpperCase()}: {(latest[fields[i]] as number).toFixed(3)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div ref={modalContainerRef} className="mb-5" />
          {windowStats ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["x", "y", "z"] as const).map((axis, i) => (
                <div key={axis} className="rounded-lg bg-gray-800/60 p-3">
                  <div className={`mb-2 text-xs font-semibold ${AXIS_COLORS[axis]}`}>{axis.toUpperCase()} Axis</div>
                  <div className="space-y-1.5 text-xs">
                    {[["Avg", windowStats.axisStats[i].avg], ["Min", windowStats.axisStats[i].min],
                      ["Max", windowStats.axisStats[i].max], ["Std Dev σ", windowStats.axisStats[i].stdDev]].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-mono text-gray-300">{(val as number).toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="rounded-lg bg-gray-800/60 p-3">
                <div className="mb-2 text-xs font-semibold text-gray-300">Magnitude</div>
                <div className="space-y-1.5 text-xs">
                  {[["Peak", windowStats.peakMag], ["Avg", windowStats.avgMag]].map(([label, val]) => (
                    <div key={label as string} className="flex justify-between">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-mono text-gray-300">{(val as number).toFixed(3)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Samples</span>
                    <span className="font-mono text-gray-400">{windowStats.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Unit</span>
                    <span className="font-mono text-gray-500">{unit}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-600">No data in current window</p>
          )}
        </ChartModal>
      )}
    </>
  );
}
