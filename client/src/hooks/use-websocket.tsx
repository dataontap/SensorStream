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
        // Request initial device list
        setTimeout(() => {
          console.log('Requesting initial device list...');
        }, 100);
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
                console.log('🔥 DASHBOARD: Received sensor update for device:', message.deviceId, message.reading);
                setLatestReadings(prev => {
                  const newMap = new Map(prev);
                  newMap.set(message.deviceId!, message.reading!);
                  console.log('🔥 DASHBOARD: Updated readings map:', newMap);
                  return newMap;
                });
              } else {
                console.warn('⚠️ DASHBOARD: Invalid sensor update message:', message);
              }
              break;
              
            default:
              console.log('🔥 DASHBOARD: Unknown WebSocket message type:', message.type, message);
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
