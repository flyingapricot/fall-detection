import { Link, useParams } from "react-router-dom";
import { useMqtt } from "../hooks/useMqtt";
import SensorChart from "../components/SensorChart";
import SensorConsole from "../components/SensorConsole";
import FallAlertBanner from "../components/FallAlertBanner";
import SubscriberList from "../components/SubscriberList";
import FallEventHistory from "../components/FallEventHistory";
import BarometerChart from "../components/BarometerChart";
import Toast from "../components/Toast";
import type { SensorReading, FallState } from "../types/sensor";
import { FALL_STATE_LABELS } from "../types/sensor";

const FALL_STATE_STYLES: Record<FallState, string | null> = {
  0: null,
  1: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
  2: "bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20",
  3: "bg-red-500/10 text-red-400 ring-1 ring-red-500/20",
};

function FallStateBadge({ state }: { state: FallState }) {
  const style = FALL_STATE_STYLES[state];
  if (!style) return null;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {FALL_STATE_LABELS[state]}
    </span>
  );
}

function exportCSV(readings: SensorReading[], boardId: string) {
  const header = "timestamp,accelX,accelY,accelZ,gyroX,gyroY,gyroZ,fallStatus,boardNumber,fallState,barometer";
  const rows = readings.map((r) =>
    [
      new Date(r.timestamp).toISOString(),
      r.accelX, r.accelY, r.accelZ,
      r.gyroX, r.gyroY, r.gyroZ,
      r.fallStatus ? 1 : 0,
      r.boardNumber,
      r.fallState,
      r.barometer,
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `board-${boardId}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    readings, latestReading, isConnected, isBoardActive, isPaused,
    fallActive, toast, clearToast, togglePause, error,
  } = useMqtt(id!);

  const fallState = latestReading?.fallState ?? 0;

  const statusDot = !isConnected
    ? "bg-gray-600"
    : isBoardActive
      ? "bg-emerald-400 animate-pulse"
      : "bg-amber-400";

  const statusText = !isConnected
    ? error ?? "Connecting..."
    : isBoardActive
      ? isPaused ? "Paused" : "Receiving data"
      : "Board inactive";

  const statusTextColor = !isConnected
    ? "text-gray-500"
    : isBoardActive
      ? isPaused ? "text-amber-400" : "text-emerald-400"
      : "text-amber-400";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">

      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-300"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          All Boards
        </Link>

        <div className="flex items-center gap-2">
          {/* Status */}
          <div className="flex items-center gap-2 rounded-full bg-gray-800/80 px-3 py-1.5 text-sm ring-1 ring-gray-700/50">
            <span className={`h-2 w-2 rounded-full ${statusDot}`} />
            <span className={`text-xs font-medium ${statusTextColor}`}>{statusText}</span>
          </div>

          {/* Fall state badge */}
          <FallStateBadge state={fallState as FallState} />

          {/* Action buttons */}
          <button
            onClick={togglePause}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isPaused
                ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-gray-800 text-gray-400 ring-1 ring-gray-700/50 hover:bg-gray-700"
            }`}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => exportCSV(readings, id!)}
            disabled={readings.length === 0}
            className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 ring-1 ring-gray-700/50 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Page header */}
      <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
            <svg className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.5" />
              <path strokeLinecap="round" d="M9 4v16M15 4v16M4 9h16M4 15h16" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Sensor Board</p>
            <h1 className="text-xl font-bold text-white">Board {id}</h1>
          </div>
        </div>
      </div>

      {/* Fall alert */}
      <div className="mb-4">
        <FallAlertBanner active={fallActive} />
      </div>

      {/* Charts */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <SensorChart readings={readings} type="accel" />
        <SensorChart readings={readings} type="gyro" />
      </div>
      <div className="mb-4">
        <BarometerChart readings={readings} />
      </div>

      {/* Subscribers */}
      <div className="mb-4">
        <SubscriberList boardId={id!} />
      </div>

      {/* Console */}
      <div className="mb-4">
        <SensorConsole readings={readings} isPaused={isPaused} fallActive={fallActive} />
      </div>

      {/* Fall event history */}
      <FallEventHistory boardId={id!} />

      <Toast message={toast} onDismiss={clearToast} />
    </div>
  );
}
