import { useEffect, useRef, useState, useCallback } from "react";
import mqtt from "mqtt";
import { parseSensorCSV, type SensorReading } from "../types/sensor";

const BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL as string;
const USERNAME = import.meta.env.VITE_MQTT_USERNAME as string;
const PASSWORD = import.meta.env.VITE_MQTT_PASSWORD as string;
const MAX_READINGS = 200;
const STALE_TIMEOUT = 5000;
const FALL_AUTO_DISMISS = 30 * 1000; // 30 seconds, matches backend TTL

export function useMqtt(boardId: string) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isBoardActive, setIsBoardActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fallActive, setFallActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferRef = useRef<SensorReading[]>([]);

  const clearToast = useCallback(() => setToast(null), []);

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
      if (!paused) {
        setReadings([...bufferRef.current]);
      }
      return paused;
    });
  }, [resetStaleTimer]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (!next) {
        setReadings([...bufferRef.current]);
      }
      return next;
    });
  }, []);

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
      client.subscribe([sensorsTopic, alertsTopic]);
    });

    client.on("message", (topic, payload) => {
      const msg = payload.toString();

      // Alerts topic: only used for RESOLVED signal
      if (topic === alertsTopic) {
        const trimmed = msg.trim();
        if (trimmed.startsWith("RESOLVED")) {
          if (fallTimerRef.current) clearTimeout(fallTimerRef.current);
          setFallActive(false);
          const username = trimmed.includes(":") ? trimmed.split(":")[1] : null;
          setToast(username ? `Fall acknowledged by @${username}` : "Fall acknowledged");
        }
        return;
      }

      // Sensors topic: parse data and drive fall state directly
      const reading = parseSensorCSV(msg);
      if (!reading) return;

      addReading(reading);

      if (reading.fallStatus) {
        // Fall detected — show banner and (re)start auto-dismiss timer
        if (fallTimerRef.current) clearTimeout(fallTimerRef.current);
        setFallActive(true);
        fallTimerRef.current = setTimeout(() => {
          setFallActive(false);
          setToast("Fall event closed by timeout");
        }, FALL_AUTO_DISMISS);
      }
    });

    client.on("error", (err) => setError(err.message));
    client.on("offline", () => setIsConnected(false));
    client.on("reconnect", () => setError(null));

    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      if (fallTimerRef.current) clearTimeout(fallTimerRef.current);
      client.unsubscribe([sensorsTopic, alertsTopic]);
      client.end();
      clientRef.current = null;
    };
  }, [boardId, addReading]);

  return { readings, latestReading, isConnected, isBoardActive, isPaused, fallActive, toast, clearToast, togglePause, error };
}
