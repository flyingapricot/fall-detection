import { useEffect, useRef, useState, useCallback } from "react";
import mqtt from "mqtt";
import { parseSensorCSV, type SensorReading } from "../types/sensor";

const BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL as string;
const USERNAME = import.meta.env.VITE_MQTT_USERNAME as string;
const PASSWORD = import.meta.env.VITE_MQTT_PASSWORD as string;
const MAX_READINGS = 200;
const STALE_TIMEOUT = 5000;

export function useMqtt(boardId: string) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isBoardActive, setIsBoardActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferRef = useRef<SensorReading[]>([]);

  const resetStaleTimer = useCallback(() => {
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    setIsBoardActive(true);
    staleTimerRef.current = setTimeout(() => setIsBoardActive(false), STALE_TIMEOUT);
  }, []);

  const addReading = useCallback((reading: SensorReading) => {
    setLatestReading(reading);
    resetStaleTimer();

    // Always buffer
    bufferRef.current = [...bufferRef.current, reading];
    if (bufferRef.current.length > MAX_READINGS) {
      bufferRef.current = bufferRef.current.slice(bufferRef.current.length - MAX_READINGS);
    }

    // Only update displayed readings when not paused
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
        // Resuming — sync displayed readings with buffer
        setReadings([...bufferRef.current]);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const topic = `fall-detection/board${boardId}/sensors`;

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
      client.subscribe(topic);
    });

    client.on("message", (_topic, payload) => {
      const reading = parseSensorCSV(payload.toString());
      if (reading) addReading(reading);
    });

    client.on("error", (err) => setError(err.message));
    client.on("offline", () => setIsConnected(false));
    client.on("reconnect", () => setError(null));

    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      client.unsubscribe(topic);
      client.end();
      clientRef.current = null;
    };
  }, [boardId, addReading]);

  return { readings, latestReading, isConnected, isBoardActive, isPaused, togglePause, error };
}
