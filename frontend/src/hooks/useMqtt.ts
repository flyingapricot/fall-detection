import { useEffect, useRef, useState, useCallback } from "react";
import mqtt from "mqtt";
import { parseSensorCSV, type SensorReading } from "../types/sensor";

const BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL as string;
const USERNAME = import.meta.env.VITE_MQTT_USERNAME as string;
const PASSWORD = import.meta.env.VITE_MQTT_PASSWORD as string;
const MAX_READINGS = 200;

export function useMqtt(boardId: string) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<mqtt.MqttClient | null>(null);

  const addReading = useCallback((reading: SensorReading) => {
    setLatestReading(reading);
    setReadings((prev) => {
      const next = [...prev, reading];
      return next.length > MAX_READINGS ? next.slice(next.length - MAX_READINGS) : next;
    });
  }, []);

  useEffect(() => {
    const topic = `fall-detection/board${boardId}/sensors`;

    const client = mqtt.connect(BROKER_URL, {
      username: USERNAME,
      password: PASSWORD,
      reconnectPeriod: 3000,
    });

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
      client.unsubscribe(topic);
      client.end();
      clientRef.current = null;
    };
  }, [boardId, addReading]);

  return { readings, latestReading, isConnected, error };
}
