import { useEffect, useRef } from "react";
import type { SensorReading } from "../types/sensor";

function fmt(n: number) {
  return n.toFixed(2).padStart(7);
}

function formatLine(r: SensorReading) {
  const t = new Date(r.timestamp);
  const ts = t.toLocaleTimeString("en-US", { hour12: false });
  const accel = `A[${fmt(r.accelX)},${fmt(r.accelY)},${fmt(r.accelZ)}]`;
  const gyro = `G[${fmt(r.gyroX)},${fmt(r.gyroY)},${fmt(r.gyroZ)}]`;
  const fall = r.fallStatus ? "  !! FALL DETECTED" : "";
  return { text: `${ts} ${accel} ${gyro}${fall}`, isFall: r.fallStatus };
}

export default function SensorConsole({
  readings,
  isPaused,
}: {
  readings: SensorReading[];
  isPaused: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [readings.length, isPaused]);

  const visible = readings.slice(-500);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Sensor Log</h3>
        {isPaused && (
          <span className="text-xs text-amber-400">Paused</span>
        )}
      </div>
      <div className="h-48 overflow-y-auto rounded bg-gray-950 p-2 font-mono text-xs leading-relaxed">
        {visible.length === 0 && (
          <span className="text-gray-600">Waiting for data...</span>
        )}
        {visible.map((r, i) => {
          const { text, isFall } = formatLine(r);
          return (
            <div key={i} className={isFall ? "text-red-400 font-bold" : "text-gray-400"}>
              {text}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
