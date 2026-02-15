import { Link, useParams } from "react-router-dom";
import { useMqtt } from "../hooks/useMqtt";
import SensorChart from "../components/SensorChart";
import SensorConsole from "../components/SensorConsole";
import FallAlertBanner from "../components/FallAlertBanner";

export default function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const { readings, latestReading, isConnected, isBoardActive, error } = useMqtt(id!);

  const statusColor = !isConnected
    ? "bg-gray-600"
    : isBoardActive
      ? "bg-emerald-400"
      : "bg-amber-400";

  const statusText = !isConnected
    ? error ?? "Connecting..."
    : isBoardActive
      ? "Receiving data"
      : "Board inactive";

  const statusTextColor = !isConnected
    ? "text-gray-500"
    : isBoardActive
      ? "text-emerald-400"
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
        <div className="flex items-center gap-2 text-sm">
          <span className={`inline-block h-2 w-2 rounded-full ${statusColor}`} />
          <span className={statusTextColor}>{statusText}</span>
        </div>
      </div>

      <h1 className="mb-4 text-xl font-bold">Board {id}</h1>

      {/* Fall alert */}
      <div className="mb-4">
        <FallAlertBanner active={latestReading?.fallStatus ?? false} />
      </div>

      {/* Charts */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <SensorChart readings={readings} type="accel" />
        <SensorChart readings={readings} type="gyro" />
      </div>

      {/* Console */}
      <SensorConsole readings={readings} />
    </div>
  );
}
