import { Link, useParams } from "react-router-dom";
import { useMqtt } from "../hooks/useMqtt";
import SensorChart from "../components/SensorChart";
import SensorConsole from "../components/SensorConsole";
import FallAlertBanner from "../components/FallAlertBanner";
import SubscriberList from "../components/SubscriberList";
import FallEventHistory from "../components/FallEventHistory";
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
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {FALL_STATE_LABELS[state]}
    </span>
  );
}

function exportCSV(readings: SensorReading[], boardId: string) {
  const header = "timestamp,accelX,accelY,accelZ,gyroX,gyroY,gyroZ,fallStatus,boardNumber";
  const rows = readings.map((r) =>
    [
      new Date(r.timestamp).toISOString(),
      r.accelX, r.accelY, r.accelZ,
      r.gyroX, r.gyroY, r.gyroZ,
      r.fallStatus ? 1 : 0,
      r.boardNumber,
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
    readings, latestReading, isConnected, isBoardActive, isPaused, fallActive, toast, clearToast, togglePause, error,
  } = useMqtt(id!);

  const fallState = latestReading?.fallState ?? 0;

  const statusColor = !isConnected
    ? "bg-gray-600"
    : isBoardActive
      ? "bg-emerald-400"
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
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/"
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          &larr; All Boards
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={`inline-block h-2 w-2 rounded-full ${statusColor}`} />
            <span className={statusTextColor}>{statusText}</span>
          </div>
          <FallStateBadge state={fallState as FallState} />
          <div className="flex gap-1.5">
            <button
              onClick={togglePause}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                isPaused
                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={() => exportCSV(readings, id!)}
              disabled={readings.length === 0}
              className="rounded bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <h1 className="mb-4 text-xl font-bold">Board {id}</h1>

      {/* Fall alert */}
      <div className="mb-4">
        <FallAlertBanner active={fallActive} />
      </div>

      {/* Charts */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <SensorChart readings={readings} type="accel" />
        <SensorChart readings={readings} type="gyro" />
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
