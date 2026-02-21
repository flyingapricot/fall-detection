export type FallState = 0 | 1 | 2 | 3;

export const FALL_STATE_LABELS: Record<FallState, string> = {
  0: "Normal",
  1: "Freefall Detected",
  2: "Impact Detected",
  3: "Fall Confirmed",
};

export interface SensorReading {
  timestamp: number;
  accelX: number;
  accelY: number;
  accelZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  fallStatus: boolean;
  boardNumber: number;
  fallState: FallState;
}

export function parseSensorCSV(csv: string): SensorReading | null {
  const parts = csv.trim().split(",");
  if (parts.length < 9) return null;

  const [aX, aY, aZ, gX, gY, gZ, fall, board, state] = parts;
  return {
    timestamp: Date.now(),
    accelX: parseFloat(aX),
    accelY: parseFloat(aY),
    accelZ: parseFloat(aZ),
    gyroX: parseFloat(gX),
    gyroY: parseFloat(gY),
    gyroZ: parseFloat(gZ),
    fallStatus: fall.trim() === "1",
    boardNumber: parseInt(board, 10),
    fallState: (parseInt(state, 10) as FallState) ?? 0,
  };
}
