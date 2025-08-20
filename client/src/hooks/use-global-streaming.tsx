import { useEffect, useRef } from 'react';
import { useGlobalSensors, startGlobalSensors, stopGlobalSensors } from './use-global-sensors';
import { useWebSocket } from './use-websocket';

// Global streaming state
let globalStreamingInterval: NodeJS.Timeout | null = null;
let isGlobalStreamingActive = false;

export function useGlobalStreaming() {
  const { sensorData, isActive } = useGlobalSensors();
  const { isConnected, sendMessage } = useWebSocket();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check localStorage for persistent streaming
  useEffect(() => {
    const checkStreamingState = () => {
      const savedStreamingState = localStorage.getItem('sensorStreaming');
      if (savedStreamingState) {
        const { deviceId, isStreaming } = JSON.parse(savedStreamingState);
        
        if (isStreaming && deviceId && isConnected && !isGlobalStreamingActive) {
          console.log('🔄 Resuming global sensor streaming for device:', deviceId);
          // Ensure sensors are active when resuming streaming
          startGlobalSensors();
          startGlobalStreaming(deviceId);
        }
      }
    };

    // Check streaming state when connection is established
    if (isConnected) {
      checkStreamingState();
    }

    // Check periodically in case state changes
    const checkInterval = setInterval(checkStreamingState, 1000);
    
    return () => clearInterval(checkInterval);
  }, [isConnected, sensorData]);

  const startGlobalStreaming = (deviceId: string) => {
    if (isGlobalStreamingActive) {
      console.log('Global streaming already active');
      return;
    }

    console.log('🚀 Starting global sensor streaming for device:', deviceId);
    isGlobalStreamingActive = true;
    
    // Ensure sensors are active when starting global streaming
    startGlobalSensors();

    const streamingFunction = () => {
      const savedStreamingState = localStorage.getItem('sensorStreaming');
      if (!savedStreamingState) {
        console.log('Stopping global streaming - localStorage cleared');
        stopGlobalStreaming();
        return;
      }

      const { isStreaming } = JSON.parse(savedStreamingState);
      if (!isStreaming) {
        console.log('Stopping global streaming - isStreaming false');
        stopGlobalStreaming();
        return;
      }

      if (sensorData && isConnected) {
        console.log('📡 Global streaming sensor data:', sensorData);
        sendMessage({
          type: 'sensor-data',
          data: {
            deviceId,
            accelerometer: sensorData.accelerometer,
            magnetometer: sensorData.magnetometer,
            orientation: sensorData.orientation,
            lightLevel: sensorData.lightLevel,
            airPressure: sensorData.airPressure,
          }
        });
      }
    };

    globalStreamingInterval = setInterval(streamingFunction, 200);
    intervalRef.current = globalStreamingInterval;
  };

  const stopGlobalStreaming = () => {
    console.log('⏹️ Stopping global sensor streaming');
    isGlobalStreamingActive = false;
    
    if (globalStreamingInterval) {
      clearInterval(globalStreamingInterval);
      globalStreamingInterval = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Cleanup on unmount (only for the current instance)
  useEffect(() => {
    return () => {
      // Don't stop global streaming when components unmount
      // Only stop if localStorage indicates streaming should stop
    };
  }, []);

  return {
    startGlobalStreaming,
    stopGlobalStreaming,
    isGlobalStreamingActive
  };
}