export type BoardStatus = "online" | "alert";

export interface Board {
  id: number;
  name: string;
  status: BoardStatus;
  lastActivity: string; // ISO timestamp
  fallDetected: boolean;
}
