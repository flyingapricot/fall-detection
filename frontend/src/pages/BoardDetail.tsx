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
  const style = FALL_STATE_STYLES[state] ?? "bg-gray-800 text-gray-400 ring-1 ring-gray-700/50";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      Board Status: {FALL_STATE_LABELS[state]}
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
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `board-${boardId}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// NFC icon — concentric arcs on each side of a center dot
function NfcIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M5 5a9.9 9.9 0 0 0 0 14" />
      <path d="M19 5a9.9 9.9 0 0 1 0 14" />
    </svg>
  );
}

export default function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    readings, isConnected, isBoardActive, isPaused,
    fallActive, displayFallState,
    nfcResolved, clearNfcResolved,
    boardExpired, dismissExpired,
    toast, clearToast, togglePause, error,
  } = useMqtt(id!);

  const fallState = displayFallState;

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
    <>
      {/* ── NFC Resolved overlay ─────────────────────────────────── */}
      {nfcResolved && (
        <>
          <style>{`
            @keyframes nfc-ol-scale {
              from { transform: scale(0.85); opacity: 0; }
              to   { transform: scale(1);    opacity: 1; }
            }
            @keyframes nfc-ol-ring {
              0%   { transform: scale(1);   opacity: 0.5; }
              100% { transform: scale(1.7); opacity: 0;   }
            }
            @keyframes nfc-ol-check {
              to { stroke-dashoffset: 0; }
            }
            @keyframes nfc-ol-text {
              from { transform: translateY(10px); opacity: 0; }
              to   { transform: translateY(0);    opacity: 1; }
            }
            .nfc-ol-card  { animation: nfc-ol-scale 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
            .nfc-ol-ring  { animation: nfc-ol-ring  1.5s ease-out 0.3s infinite; }
            .nfc-ol-check { stroke-dasharray: 56; stroke-dashoffset: 56;
                            animation: nfc-ol-check 0.5s ease-out 0.5s forwards; }
            .nfc-ol-text  { animation: nfc-ol-text  0.4s ease-out 0.6s both; }
          `}</style>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
            onClick={clearNfcResolved}
          >
            <div
              className="nfc-ol-card relative w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-gray-950 p-8 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glow */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
              </div>

              {/* Icon stack */}
              <div className="relative z-10 mb-6 flex items-center justify-center">
                <div className="nfc-ol-ring absolute h-24 w-24 rounded-full bg-emerald-500/25" />
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/40">
                  {/* NFC icon behind checkmark */}
                  <NfcIcon className="absolute h-10 w-10 text-emerald-500/30" />
                  {/* Animated checkmark on top */}
                  <svg className="relative h-10 w-10" viewBox="0 0 56 56" fill="none">
                    <path
                      className="nfc-ol-check"
                      d="M14 28l11 11 17-22"
                      stroke="#10b981"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Text */}
              <div className="nfc-ol-text relative z-10">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                  <NfcIcon className="h-3.5 w-3.5" />
                  NFC tap detected
                </div>
                <h2 className="text-2xl font-bold text-white">Alert Cleared</h2>
                <p className="mt-1.5 text-sm text-gray-400">Board {id}</p>
                <p className="mt-3 text-sm text-gray-500">
                  The fall alert has been resolved. The board is returning to normal monitoring.
                </p>
                <button
                  onClick={clearNfcResolved}
                  className="mt-5 text-xs text-gray-600 underline-offset-2 hover:text-gray-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mx-auto max-w-6xl px-4 py-6">

        {/* ── Board-expired warning ─────────────────────────────── */}
        {boardExpired && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 ring-1 ring-orange-500/20">
            <div className="mt-0.5 shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-400">Board may be unresponsive</p>
              <p className="mt-0.5 text-sm text-orange-400/70">
                This fall alert has been active for over 5 minutes without being cleared by an NFC tap.
                The board may have lost power or be malfunctioning — please check the board physically.
              </p>
            </div>
            <button
              onClick={dismissExpired}
              className="shrink-0 rounded p-0.5 text-orange-500 transition-colors hover:bg-orange-500/20 hover:text-orange-300"
              aria-label="Dismiss warning"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        )}

        {/* Top bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-300"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            All Boards
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-gray-800/80 px-3 py-1.5 ring-1 ring-gray-700/50">
              <span className={`h-2 w-2 rounded-full ${statusDot}`} />
              <span className={`text-xs font-medium ${statusTextColor}`}>{statusText}</span>
            </div>
            <FallStateBadge state={fallState as FallState} />
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

        {/* Fall alert banner */}
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
        <FallEventHistory boardId={id!} fallActive={fallActive} />

        <Toast message={toast} onDismiss={clearToast} />
      </div>
    </>
  );
}
