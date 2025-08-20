import { useEffect, useState, useCallback } from 'react';

interface SensorData {
  accelerometer: { x: number; y: number; z: number } | null;
  magnetometer: { x: number; y: number; z: number } | null;
  orientation: { alpha: number; beta: number; gamma: number } | null;
  lightLevel: number | null;
  airPressure: number | null;
}

// Global sensor state that persists across components
let globalSensorData: SensorData = {
  accelerometer: null,
  magnetometer: null,
  orientation: null,
  lightLevel: null,
  airPressure: null,
};

let globalSensorListeners: (() => void)[] = [];
let isGlobalSensorsActive = false;
let lightInterval: NodeJS.Timeout | null = null;
let pressureInterval: NodeJS.Timeout | null = null;
let simulatedMotionInterval: NodeJS.Timeout | null = null;

// Callbacks to notify components of data updates
let dataCallbacks: ((data: SensorData) => void)[] = [];

const notifyDataUpdate = () => {
  dataCallbacks.forEach(callback => callback({ ...globalSensorData }));
};

const handleDeviceMotion = (event: DeviceMotionEvent) => {
  if (event.accelerationIncludingGravity) {
    globalSensorData.accelerometer = {
      x: event.accelerationIncludingGravity.x || 0,
      y: event.accelerationIncludingGravity.y || 0,
      z: event.accelerationIncludingGravity.z || 0,
    };
    notifyDataUpdate();
  }
};

const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
  globalSensorData.orientation = {
    alpha: event.alpha || 0,
    beta: event.beta || 0,
    gamma: event.gamma || 0,
  };
  
  // Approximate magnetometer from device orientation
  globalSensorData.magnetometer = {
    x: Math.sin((event.alpha || 0) * Math.PI / 180) * 50,
    y: Math.sin((event.beta || 0) * Math.PI / 180) * 50,
    z: Math.sin((event.gamma || 0) * Math.PI / 180) * 50,
  };
  
  notifyDataUpdate();
};

export function startGlobalSensors() {
  if (isGlobalSensorsActive) {
    console.log('🔄 Global sensors already active');
    return;
  }

  console.log('🚀 Starting global sensors');
  isGlobalSensorsActive = true;

  // Check for device motion/orientation support
  const hasDeviceMotion = 'DeviceMotionEvent' in window;
  const hasDeviceOrientation = 'DeviceOrientationEvent' in window;

  if (hasDeviceMotion) {
    window.addEventListener('devicemotion', handleDeviceMotion);
    globalSensorListeners.push(() => window.removeEventListener('devicemotion', handleDeviceMotion));
  } else {
    // Simulate accelerometer for desktop testing
    console.log('🖥️ Simulating accelerometer data for desktop');
    simulatedMotionInterval = setInterval(() => {
      globalSensorData.accelerometer = {
        x: (Math.random() - 0.5) * 20, // ±10 m/s²
        y: (Math.random() - 0.5) * 20,
        z: 9.8 + (Math.random() - 0.5) * 2, // Around gravity with some variation
      };
      notifyDataUpdate();
    }, 100);
    
    globalSensorListeners.push(() => {
      if (simulatedMotionInterval) {
        clearInterval(simulatedMotionInterval);
        simulatedMotionInterval = null;
      }
    });
  }

  if (hasDeviceOrientation) {
    window.addEventListener('deviceorientation', handleDeviceOrientation);
    globalSensorListeners.push(() => window.removeEventListener('deviceorientation', handleDeviceOrientation));
  } else {
    // Simulate magnetometer for desktop testing
    console.log('🖥️ Simulating magnetometer data for desktop');
    const magInterval = setInterval(() => {
      const time = Date.now() / 1000;
      globalSensorData.magnetometer = {
        x: Math.sin(time * 0.5) * 30 + (Math.random() - 0.5) * 5,
        y: Math.cos(time * 0.3) * 25 + (Math.random() - 0.5) * 5,
        z: Math.sin(time * 0.7) * 20 + (Math.random() - 0.5) * 5,
      };
      
      globalSensorData.orientation = {
        alpha: (time * 10) % 360,
        beta: Math.sin(time * 0.2) * 45,
        gamma: Math.cos(time * 0.15) * 30,
      };
      
      notifyDataUpdate();
    }, 100);
    
    globalSensorListeners.push(() => clearInterval(magInterval));
  }

  // Light sensor simulation
  lightInterval = setInterval(() => {
    globalSensorData.lightLevel = Math.max(0, Math.sin(Date.now() / 10000) * 500 + 300 + (Math.random() - 0.5) * 100);
    notifyDataUpdate();
  }, 500);
  
  globalSensorListeners.push(() => {
    if (lightInterval) {
      clearInterval(lightInterval);
      lightInterval = null;
    }
  });

  // Air pressure sensor simulation
  pressureInterval = setInterval(() => {
    globalSensorData.airPressure = 1013.25 + Math.sin(Date.now() / 20000) * 20 + (Math.random() - 0.5) * 5;
    notifyDataUpdate();
  }, 1000);
  
  globalSensorListeners.push(() => {
    if (pressureInterval) {
      clearInterval(pressureInterval);
      pressureInterval = null;
    }
  });

  console.log('✅ Global sensors started successfully');
}

export function stopGlobalSensors() {
  if (!isGlobalSensorsActive) return;

  console.log('⏹️ Stopping global sensors');
  isGlobalSensorsActive = false;

  // Clean up all listeners
  globalSensorListeners.forEach(cleanup => cleanup());
  globalSensorListeners = [];

  // Reset sensor data
  globalSensorData = {
    accelerometer: null,
    magnetometer: null,
    orientation: null,
    lightLevel: null,
    airPressure: null,
  };
  
  notifyDataUpdate();
}

export function useGlobalSensors() {
  const [sensorData, setSensorData] = useState<SensorData>(globalSensorData);

  useEffect(() => {
    // Register for data updates
    const callback = (data: SensorData) => setSensorData(data);
    dataCallbacks.push(callback);

    // Set initial data
    setSensorData({ ...globalSensorData });

    return () => {
      // Unregister callback
      const index = dataCallbacks.indexOf(callback);
      if (index > -1) {
        dataCallbacks.splice(index, 1);
      }
    };
  }, []);

  return {
    sensorData,
    isActive: isGlobalSensorsActive,
    startGlobalSensors,
    stopGlobalSensors,
  };
}