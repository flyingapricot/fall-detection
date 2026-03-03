import { useEffect, useRef, useState, useCallback } from "react";
import mqtt from "mqtt";
import { parseSensorCSV, type SensorReading } from "../types/sensor";

const BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL as string;
const USERNAME = import.meta.env.VITE_MQTT_USERNAME as string;
const PASSWORD = import.meta.env.VITE_MQTT_PASSWORD as string;
const MAX_READINGS = 200;
const STALE_TIMEOUT = 5000;
const NFC_RESOLVED_DISPLAY_MS = 6000;

export function useMqtt(boardId: string) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isBoardActive, setIsBoardActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fallActive, setFallActive] = useState(false);
  const [displayFallState, setDisplayFallState] = useState<number>(0);
  const [nfcResolved, setNfcResolved] = useState(false);
  const [boardExpired, setBoardExpired] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nfcResolvedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferRef = useRef<SensorReading[]>([]);
  const prevFallActiveRef = useRef(false);

  const clearToast = useCallback(() => setToast(null), []);

  const clearNfcResolved = useCallback(() => {
    if (nfcResolvedTimerRef.current) clearTimeout(nfcResolvedTimerRef.current);
    setNfcResolved(false);
  }, []);

  const dismissExpired = useCallback(() => setBoardExpired(false), []);

  const resetStaleTimer = useCallback(() => {
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    setIsBoardActive(true);
    staleTimerRef.current = setTimeout(() => setIsBoardActive(false), STALE_TIMEOUT);
  }, []);

  const addReading = useCallback((reading: SensorReading) => {
    setLatestReading(reading);
    resetStaleTimer();

    bufferRef.current = [...bufferRef.current, reading];
    if (bufferRef.current.length > MAX_READINGS) {
      bufferRef.current = bufferRef.current.slice(bufferRef.current.length - MAX_READINGS);
    }

    setIsPaused((paused) => {
      if (!paused) setReadings([...bufferRef.current]);
      return paused;
    });
  }, [resetStaleTimer]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (!next) setReadings([...bufferRef.current]);
      return next;
    });
  }, []);

  // When fallActive transitions true→false, clear the board-expired warning
  // (board is operational again) and clear the boardExpired state.
  useEffect(() => {
    if (prevFallActiveRef.current && !fallActive) {
      setBoardExpired(false);
    }
    prevFallActiveRef.current = fallActive;
  }, [fallActive]);

  useEffect(() => {
    const sensorsTopic = `fall-detection/board${boardId}/sensors`;
    const alertsTopic = `fall-detection/board${boardId}/alerts`;

    let client: mqtt.MqttClient;
    try {
      client = mqtt.connect(BROKER_URL, {
        username: USERNAME,
        password: PASSWORD,
        reconnectPeriod: 3000,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      return;
    }

    clientRef.current = client;

    client.on("connect", () => {
      setIsConnected(true);
      setError(null);
      client.subscribe(sensorsTopic, { qos: 0 });
      client.subscribe(alertsTopic, { qos: 1 });
    });

    client.on("message", (topic, payload) => {
      const msg = payload.toString().trim();

      if (topic === alertsTopic) {
        if (msg === "NFC_RESOLVED") {
          // Board was reset via NFC tap — show the prominent overlay
          if (nfcResolvedTimerRef.current) clearTimeout(nfcResolvedTimerRef.current);
          setNfcResolved(true);
          nfcResolvedTimerRef.current = setTimeout(
            () => setNfcResolved(false),
            NFC_RESOLVED_DISPLAY_MS,
          );
        } else if (msg === "BOARD_EXPIRED") {
          // Safety-net: fall active for 5+ mins with no NFC tap
          setBoardExpired(true);
        }
        // All other alert messages (BOARD_RESET loopback etc.) are ignored by frontend
        return;
      }

      // Sensors topic: board is the sole source of truth.
      // fallStatus drives the banner; only resets via NFC tap (fallStatus → 0).
      const reading = parseSensorCSV(msg);
      if (!reading) return;

      addReading(reading);
      setFallActive(reading.fallStatus);
      setDisplayFallState(reading.fallState);
    });

    client.on("error", (err) => setError(err.message));
    client.on("offline", () => setIsConnected(false));
    client.on("reconnect", () => setError(null));

    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      if (nfcResolvedTimerRef.current) clearTimeout(nfcResolvedTimerRef.current);
      client.unsubscribe([sensorsTopic, alertsTopic]);
      client.end();
      clientRef.current = null;
    };
  }, [boardId, addReading]);

  return {
    readings,
    latestReading,
    isConnected,
    isBoardActive,
    isPaused,
    fallActive,
    displayFallState,
    nfcResolved,
    clearNfcResolved,
    boardExpired,
    dismissExpired,
    toast,
    clearToast,
    togglePause,
    error,
  };
}
