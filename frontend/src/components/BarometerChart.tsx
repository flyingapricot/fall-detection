import { useEffect, useMemo, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { SensorReading } from "../types/sensor";
import ChartModal from "./ChartModal";

const WINDOW_SECS = 30;
const COLOR = "#06b6d4";

function fmtTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("en-US", { hour12: false });
}

function buildOpts(el: HTMLElement, height: number): uPlot.Options {
  return {
    width: el.clientWidth, height,
    cursor: { show: false }, legend: { show: false },
    axes: [
      { stroke: "#6b7280", grid: { stroke: "#1f2937" }, ticks: { stroke: "#374151" },
        values: (_u, splits) => splits.map(fmtTime) },
      { stroke: "#6b7280", grid: { stroke: "#1f2937" }, ticks: { stroke: "#374151" },
        values: (_u, splits) => splits.map((s) => s.toFixed(1) + " hPa"), size: 85 },
    ],
    series: [{}, { stroke: COLOR, width: 2, fill: COLOR + "18", paths: uPlot.paths.spline?.() }],
  };
}

function applyData(chart: uPlot, readings: SensorReading[]) {
  const nowSecs = Date.now() / 1000;
  const windowStart = nowSecs - WINDOW_SECS;
  const w = readings.filter((r) => r.timestamp / 1000 >= windowStart);
  chart.setData([w.map((r) => r.timestamp / 1000), w.map((r) => r.barometer)]);
  chart.setScale("x", { min: windowStart, max: nowSecs + 3 });
}

function estimateAltitude(hPa: number) {
  return 44330 * (1 - Math.pow(hPa / 1013.25, 0.1903));
}

export default function BarometerChart({ readings }: { readings: SensorReading[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<uPlot | null>(null);
  const modalRoRef = useRef<ResizeObserver | null>(null);

  const [isMaximized, setIsMaximized] = useState(false);
  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  const windowStats = useMemo(() => {
    const windowStart = Date.now() - WINDOW_SECS * 1000;
    const w = readings.filter((r) => r.timestamp >= windowStart);
    if (w.length === 0) return null;
    const vals = w.map((r) => r.barometer);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = vals.reduce((a, b) => Math.min(a, b));
    const max = vals.reduce((a, b) => Math.max(a, b));
    const half = Math.min(5, Math.floor(vals.length / 2));
    const delta = vals.slice(-half).reduce((a, b) => a + b, 0) / half
                - vals.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const trend = delta > 0.2 ? "Rising ↑" : delta < -0.2 ? "Falling ↓" : "Stable →";
    const trendColor = delta > 0.2 ? "text-emerald-400" : delta < -0.2 ? "text-red-400" : "text-gray-400";
    return { avg, min, max, range: max - min, trend, trendColor, altitudeM: estimateAltitude(avg), count: vals.length };
  }, [readings]);

  // Regular chart
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = new uPlot(buildOpts(el, 160), [[], []], el);
    chartRef.current = chart;
    const ro = new ResizeObserver(([e]) => { if (e.contentRect.width > 0) chart.setSize({ width: e.contentRect.width, height: 160 }); });
    ro.observe(el);
    return () => { ro.disconnect(); chart.destroy(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    if (!chartRef.current || readings.length === 0) return;
    applyData(chartRef.current, readings);
  }, [readings]);

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
      const chart = new uPlot(buildOpts(el, 320), [[], []], el);
      modalChartRef.current = chart;
      const ro = new ResizeObserver(([e]) => { if (e.contentRect.width > 0) chart.setSize({ width: e.contentRect.width, height: 320 }); });
      ro.observe(el); modalRoRef.current = ro;
      if (readings.length > 0) applyData(chart, readings);
    });
    return () => {
      cancelAnimationFrame(raf);
      modalRoRef.current?.disconnect(); modalRoRef.current = null;
      modalChartRef.current?.destroy(); modalChartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMaximized]);

  useEffect(() => {
    if (!isMaximized || !modalChartRef.current || readings.length === 0) return;
    applyData(modalChartRef.current, readings);
  }, [readings, isMaximized]);

  return (
    <>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">
            Barometer<span className="ml-1.5 text-xs text-gray-500">(hPa)</span>
          </h3>
          <div className="flex items-center gap-2">
            {latest ? (
              <span className="font-mono text-xs text-cyan-400">{latest.barometer.toFixed(2)} hPa</span>
            ) : (
              <span className="text-xs text-gray-600">Waiting for data...</span>
            )}
            <button onClick={() => setIsMaximized(true)}
              className="rounded p-1 text-gray-600 transition-colors hover:bg-gray-800 hover:text-gray-400" title="Expand">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.28 7.78l3.22-3.22v2.69a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.69l-3.22 3.22a.75.75 0 0 0 1.06 1.06ZM2 17.25v-4.5a.75.75 0 0 1 1.5 0v2.69l3.22-3.22a.75.75 0 0 1 1.06 1.06L4.56 16.5h2.69a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
              </svg>
            </button>
          </div>
        </div>
        <div ref={containerRef} />
      </div>

      {isMaximized && (
        <ChartModal
          title="Barometer"
          subtitle={`Last ${WINDOW_SECS}s · ${windowStats?.count ?? 0} samples · hPa`}
          onClose={() => setIsMaximized(false)}
        >
          {latest && <div className="mb-3 font-mono text-sm text-cyan-400">{latest.barometer.toFixed(3)} hPa</div>}
          <div ref={modalContainerRef} className="mb-5" />
          {windowStats ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-800/60 p-3">
                <div className="mb-2 text-xs font-semibold text-cyan-400">Pressure</div>
                <div className="space-y-1.5 text-xs">
                  {[["Avg", windowStats.avg.toFixed(2) + " hPa"], ["Min", windowStats.min.toFixed(2) + " hPa"],
                    ["Max", windowStats.max.toFixed(2) + " hPa"], ["Range", windowStats.range.toFixed(3) + " hPa"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-mono text-gray-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-gray-800/60 p-3">
                <div className="mb-2 text-xs font-semibold text-gray-300">Trend</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Direction</span>
                    <span className={`font-mono font-medium ${windowStats.trendColor}`}>{windowStats.trend}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Samples</span>
                    <span className="font-mono text-gray-400">{windowStats.count}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-gray-800/60 p-3">
                <div className="mb-2 text-xs font-semibold text-gray-300">Altitude</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Est.</span>
                    <span className="font-mono text-gray-300">{windowStats.altitudeM.toFixed(0)} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ref</span>
                    <span className="font-mono text-gray-500">ISA 1013.25</span>
                  </div>
                </div>
              </div>
              {latest && (
                <div className="rounded-lg bg-gray-800/60 p-3">
                  <div className="mb-2 text-xs font-semibold text-gray-300">Live</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Now</span>
                      <span className="font-mono text-cyan-400">{latest.barometer.toFixed(3)} hPa</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Alt now</span>
                      <span className="font-mono text-gray-400">{estimateAltitude(latest.barometer).toFixed(0)} m</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-600">No data in current window</p>
          )}
        </ChartModal>
      )}
    </>
  );
}
