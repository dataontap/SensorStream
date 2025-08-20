import { useEffect, useRef } from 'react';
import { useSensors } from './use-sensors';
import { useWebSocket } from './use-websocket';

interface PersistentStreamingState {
  deviceId: string | null;
  isStreaming: boolean;
}

// Global state for persistent streaming
let globalStreamingState: PersistentStreamingState = {
  deviceId: null,
  isStreaming: false
};

let streamingInterval: NodeJS.Timeout | null = null;

export function usePersistentStreaming() {
  const { sensorData, isActive } = useSensors();
  const { isConnected, sendMessage } = useWebSocket();
  const currentDeviceId = useRef<string | null>(null);

  const startStreaming = (deviceId: string) => {
    console.log('🔄 Starting persistent sensor streaming for device:', deviceId);
    globalStreamingState.deviceId = deviceId;
    globalStreamingState.isStreaming = true;
    currentDeviceId.current = deviceId;

    // Clear any existing interval
    if (streamingInterval) {
      clearInterval(streamingInterval);
    }

    // Start the streaming interval
    streamingInterval = setInterval(() => {
      if (sensorData && isConnected && globalStreamingState.isStreaming) {
        console.log('📡 Sending persistent sensor data:', sensorData);
        sendMessage({
          type: 'sensor-data',
          data: {
            deviceId: globalStreamingState.deviceId,
            accelerometer: sensorData.accelerometer,
            magnetometer: sensorData.magnetometer,
            orientation: sensorData.orientation,
            lightLevel: sensorData.lightLevel,
            airPressure: sensorData.airPressure,
            userLocalTime: new Date().toISOString(),
            userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        });
      }
    }, 200); // Send data every 200ms for real-time streaming
  };

  const stopStreaming = () => {
    console.log('⏹️ Stopping persistent sensor streaming');
    globalStreamingState.isStreaming = false;
    globalStreamingState.deviceId = null;
    currentDeviceId.current = null;
    
    if (streamingInterval) {
      clearInterval(streamingInterval);
      streamingInterval = null;
    }
  };

  // Effect to handle sensor data streaming
  useEffect(() => {
    if (!globalStreamingState.isStreaming || !globalStreamingState.deviceId || !isConnected) {
      return;
    }

    // Ensure we have the latest sensor data reference
    // The interval will pick up the latest sensorData from the hook
  }, [sensorData, isConnected]);

  // Cleanup on unmount (but only if this component started the streaming)
  useEffect(() => {
    return () => {
      // Only stop if this component was the one that started streaming
      // and the component is actually unmounting (not just re-rendering)
      if (currentDeviceId.current && globalStreamingState.deviceId === currentDeviceId.current) {
        // Don't stop streaming on unmount - let it persist!
        console.log('📱 Component unmounting but keeping sensor streaming active');
      }
    };
  }, []);

  return {
    startStreaming,
    stopStreaming,
    isStreaming: globalStreamingState.isStreaming,
    streamingDeviceId: globalStreamingState.deviceId
  };
}