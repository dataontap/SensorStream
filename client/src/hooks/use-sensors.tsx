import { useEffect, useState, useCallback } from 'react';

interface SensorData {
  accelerometer: { x: number; y: number; z: number } | null;
  magnetometer: { x: number; y: number; z: number } | null;
  orientation: { alpha: number; beta: number; gamma: number } | null;
  lightLevel: number | null;
  airPressure: number | null;
}

interface UseSensorsReturn {
  sensorData: SensorData;
  isSupported: {
    accelerometer: boolean;
    magnetometer: boolean;
    orientation: boolean;
    light: boolean;
    pressure: boolean;
  };
  requestPermissions: () => Promise<boolean>;
  startSensors: () => void;
  stopSensors: () => void;
  isActive: boolean;
}

export function useSensors(): UseSensorsReturn {
  const [sensorData, setSensorData] = useState<SensorData>({
    accelerometer: null,
    magnetometer: null,
    orientation: null,
    lightLevel: null,
    airPressure: null,
  });
  
  const [isSupported, setIsSupported] = useState({
    accelerometer: false,
    magnetometer: false,
    orientation: false,
    light: false,
    pressure: false,
  });
  
  const [isActive, setIsActive] = useState(false);

  // Check sensor support
  useEffect(() => {
    setIsSupported({
      accelerometer: 'DeviceMotionEvent' in window,
      magnetometer: 'DeviceOrientationEvent' in window,
      orientation: 'DeviceOrientationEvent' in window,
      light: 'AmbientLightSensor' in window,
      pressure: 'Sensor' in window, // Basic check for generic sensor API
    });
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // Request device motion and orientation permissions for iOS 13+
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const motionPermission = await (DeviceMotionEvent as any).requestPermission();
        const orientationPermission = await (DeviceOrientationEvent as any).requestPermission();
        
        return motionPermission === 'granted' && orientationPermission === 'granted';
      }
      
      // For other browsers, permissions are typically granted automatically
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }, []);

  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (event.accelerationIncludingGravity) {
      setSensorData(prev => ({
        ...prev,
        accelerometer: {
          x: event.accelerationIncludingGravity!.x || 0,
          y: event.accelerationIncludingGravity!.y || 0,
          z: event.accelerationIncludingGravity!.z || 0,
        },
      }));
    }
  }, []);

  const handleDeviceOrientation = useCallback((event: DeviceOrientationEvent) => {
    setSensorData(prev => ({
      ...prev,
      orientation: {
        alpha: event.alpha || 0,
        beta: event.beta || 0,
        gamma: event.gamma || 0,
      },
      // Approximate magnetometer from device orientation
      magnetometer: {
        x: Math.sin((event.alpha || 0) * Math.PI / 180) * 50,
        y: Math.sin((event.beta || 0) * Math.PI / 180) * 50,
        z: Math.sin((event.gamma || 0) * Math.PI / 180) * 50,
      },
    }));
  }, []);

  const startSensors = useCallback(() => {
    if (!isActive) {
      console.log('Starting sensors...', isSupported);
      setIsActive(true);
      
      if (isSupported.accelerometer) {
        window.addEventListener('devicemotion', handleDeviceMotion);
      }
      
      if (isSupported.orientation) {
        window.addEventListener('deviceorientation', handleDeviceOrientation);
      }
      
      // Simulate light sensor (as most browsers don't support AmbientLightSensor yet)
      console.log('Setting up simulated sensors');
      const lightInterval = setInterval(() => {
        setSensorData(prev => ({
          ...prev,
          lightLevel: Math.random() * 1000, // Random value between 0-1000 lux
        }));
      }, 1000);
        
      // Clear intervals on cleanup
      const intervalIds = [lightInterval];
      
      // Simulate air pressure sensor
      const pressureInterval = setInterval(() => {
        setSensorData(prev => ({
          ...prev,
          airPressure: 1013.25 + (Math.random() - 0.5) * 10, // Around sea level pressure
        }));
      }, 2000);
      
      return () => clearInterval(pressureInterval);
    }
  }, [isActive, isSupported, handleDeviceMotion, handleDeviceOrientation]);

  const stopSensors = useCallback(() => {
    if (isActive) {
      setIsActive(false);
      window.removeEventListener('devicemotion', handleDeviceMotion);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    }
  }, [isActive, handleDeviceMotion, handleDeviceOrientation]);

  return {
    sensorData,
    isSupported,
    requestPermissions,
    startSensors,
    stopSensors,
    isActive,
  };
}
