import { useEffect, useRef, useState } from 'react';
import { Device, SensorReading } from '@shared/schema';

interface WebSocketMessage {
  type: 'device-list' | 'sensor-update' | 'register-response';
  devices?: Device[];
  deviceId?: string;
  reading?: SensorReading;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  devices: Device[];
  latestReadings: Map<string, SensorReading>;
  sendMessage: (message: any) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [latestReadings, setLatestReadings] = useState(new Map<string, SensorReading>());
  const wsRef = useRef<WebSocket | null>(null);

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'device-list':
              if (message.devices) {
                console.log('Received device list:', message.devices);
                setDevices(message.devices);
              }
              break;
              
            case 'sensor-update':
              if (message.deviceId && message.reading) {
                console.log('Received sensor update for device:', message.deviceId, message.reading);
                setLatestReadings(prev => new Map(prev.set(message.deviceId!, message.reading!)));
              }
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    isConnected,
    devices,
    latestReadings,
    sendMessage,
  };
}
