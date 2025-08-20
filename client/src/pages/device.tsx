import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { useSensors } from '@/hooks/use-sensors';
import { useWebSocket } from '@/hooks/use-websocket';
import { generateDeviceFingerprint, getDeviceName } from '@/lib/device-fingerprint';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function DevicePage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const { sensorData, isSupported, requestPermissions, startSensors, stopSensors, isActive } = useSensors();
  const { isConnected, sendMessage } = useWebSocket();

  // Create device mutation
  const createDeviceMutation = useMutation({
    mutationFn: async (deviceData: { id: string; name: string; userAgent?: string }) => {
      const response = await apiRequest('POST', '/api/devices', deviceData);
      return response.json();
    },
    onSuccess: (device) => {
      setDeviceId(device.id);
      setIsRegistered(true);
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      
      // Register with WebSocket
      if (isConnected) {
        console.log('Registering device with WebSocket:', device.id);
        sendMessage({
          type: 'register',
          deviceId: device.id
        });
      }
      
      toast({
        title: "Device Registered",
        description: `Device ${device.name} has been registered successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: "Failed to register device. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Generate device ID on component mount
  useEffect(() => {
    const id = generateDeviceFingerprint();
    setDeviceId(id);
  }, []);

  // Check for persistent streaming on mount
  useEffect(() => {
    const savedStreamingState = localStorage.getItem('sensorStreaming');
    if (savedStreamingState) {
      const { deviceId: savedDeviceId, isStreaming: savedIsStreaming } = JSON.parse(savedStreamingState);
      if (savedIsStreaming && savedDeviceId === deviceId) {
        setIsStreaming(true);
        setIsRegistered(true);
        // Resume sensors if they were active
        if (isSupported) {
          startSensors();
        }
      }
    }
  }, [deviceId, isSupported, startSensors]);

  // Stream sensor data when active - keep alive across navigation
  useEffect(() => {
    if (!isStreaming || !deviceId || !isConnected) return;

    // Save streaming state to localStorage
    localStorage.setItem('sensorStreaming', JSON.stringify({
      deviceId,
      isStreaming: true
    }));

    const interval = setInterval(() => {
      if (sensorData) {
        console.log('📡 Sending persistent sensor data:', sensorData);
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
    }, 200); // Send data every 200ms

    return () => {
      // Don't clear interval on component unmount if streaming should persist
      const shouldPersist = localStorage.getItem('sensorStreaming');
      if (!shouldPersist) {
        clearInterval(interval);
      }
    };
  }, [isStreaming, deviceId, sensorData, isConnected, sendMessage]);

  const handleRegisterDevice = async () => {
    if (!deviceId) return;

    try {
      await createDeviceMutation.mutateAsync({
        id: deviceId,
        name: getDeviceName(),
        userAgent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    if (granted) {
      toast({
        title: "Permissions Granted",
        description: "Sensor permissions have been granted.",
      });
    } else {
      toast({
        title: "Permissions Denied",
        description: "Sensor permissions are required for data collection.",
        variant: "destructive",
      });
    }
  };

  const handleStartSensors = () => {
    startSensors();
    setIsStreaming(true);
    
    // Save persistent streaming state
    if (deviceId) {
      localStorage.setItem('sensorStreaming', JSON.stringify({
        deviceId,
        isStreaming: true
      }));
    }
    
    // Ensure WebSocket registration when starting sensors
    if (isConnected && deviceId) {
      console.log('Re-registering device with WebSocket for streaming:', deviceId);
      sendMessage({
        type: 'register',
        deviceId: deviceId
      });
    }
    
    toast({
      title: "Sensors Started",
      description: "Sensor data streaming has started and will continue even when you navigate to other pages.",
    });
  };

  const handleStopSensors = () => {
    stopSensors();
    setIsStreaming(false);
    
    // Clear persistent streaming state
    localStorage.removeItem('sensorStreaming');
    
    toast({
      title: "Sensors Stopped",
      description: "Sensor data collection has stopped.",
    });
  };


  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <header className="mb-8" data-testid="device-page-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="material-icons text-primary text-3xl">smartphone</span>
            <div>
              <h1 className="text-2xl font-bold text-secondary">Device Setup</h1>
              <p className="text-gray-500">Configure your device for sensor data collection</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" className="flex items-center space-x-2" data-testid="button-view-dashboard">
              <span className="material-icons text-sm">dashboard</span>
              <span>View Dashboard</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Device Info Card */}
        <Card data-testid="device-info-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="material-icons text-primary">info</span>
              <span>Device Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Device ID</p>
                <p className="font-mono text-sm" data-testid="device-id">{deviceId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Device Name</p>
                <p className="font-medium" data-testid="device-name">{getDeviceName()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">User Agent</p>
                <p className="text-xs text-gray-600 truncate" data-testid="user-agent">
                  {navigator.userAgent}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Connection Status</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-success' : 'bg-error'
                  }`} />
                  <span className={`text-sm ${
                    isConnected ? 'text-success' : 'text-error'
                  }`} data-testid="connection-status">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sensor Support Card */}
        <Card data-testid="sensor-support-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="material-icons text-primary">sensors</span>
              <span>Sensor Support</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm">Accelerometer</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isSupported.accelerometer ? 'bg-success' : 'bg-error'
                  }`} />
                  <span className="text-xs" data-testid="accelerometer-support">
                    {isSupported.accelerometer ? 'Supported' : 'Not supported'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm">Magnetometer</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isSupported.magnetometer ? 'bg-success' : 'bg-error'
                  }`} />
                  <span className="text-xs" data-testid="magnetometer-support">
                    {isSupported.magnetometer ? 'Supported' : 'Not supported'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm">Orientation</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isSupported.orientation ? 'bg-success' : 'bg-error'
                  }`} />
                  <span className="text-xs" data-testid="orientation-support">
                    {isSupported.orientation ? 'Supported' : 'Not supported'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm">Light Sensor</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isSupported.light ? 'bg-success' : 'bg-warning'
                  }`} />
                  <span className="text-xs" data-testid="light-support">
                    {isSupported.light ? 'Supported' : 'Simulated'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm">Air Pressure</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isSupported.pressure ? 'bg-success' : 'bg-warning'
                  }`} />
                  <span className="text-xs" data-testid="pressure-support">
                    {isSupported.pressure ? 'Supported' : 'Simulated'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Sensor Data Card */}
        {isActive && (
          <Card data-testid="current-sensor-data-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="material-icons text-primary">show_chart</span>
                <span>Current Sensor Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sensorData.accelerometer && (
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium mb-2">Accelerometer</p>
                    <div className="space-y-1 text-xs">
                      <div>X: <span className="font-mono" data-testid="accel-x">{sensorData.accelerometer.x.toFixed(2)} m/s²</span></div>
                      <div>Y: <span className="font-mono" data-testid="accel-y">{sensorData.accelerometer.y.toFixed(2)} m/s²</span></div>
                      <div>Z: <span className="font-mono" data-testid="accel-z">{sensorData.accelerometer.z.toFixed(2)} m/s²</span></div>
                    </div>
                  </div>
                )}
                
                {sensorData.magnetometer && (
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium mb-2">Magnetometer</p>
                    <div className="space-y-1 text-xs">
                      <div>X: <span className="font-mono" data-testid="mag-x">{sensorData.magnetometer.x.toFixed(1)} μT</span></div>
                      <div>Y: <span className="font-mono" data-testid="mag-y">{sensorData.magnetometer.y.toFixed(1)} μT</span></div>
                      <div>Z: <span className="font-mono" data-testid="mag-z">{sensorData.magnetometer.z.toFixed(1)} μT</span></div>
                    </div>
                  </div>
                )}
                
                {sensorData.lightLevel !== null && (
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium mb-2">Light Level</p>
                    <p className="text-lg font-mono" data-testid="light-level">
                      {sensorData.lightLevel.toFixed(0)} lx
                    </p>
                  </div>
                )}
                
                {sensorData.airPressure !== null && (
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium mb-2">Air Pressure</p>
                    <p className="text-lg font-mono" data-testid="air-pressure">
                      {sensorData.airPressure.toFixed(2)} hPa
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions Card */}
        <Card data-testid="actions-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="material-icons text-primary">settings</span>
              <span>Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!isRegistered ? (
                <div className="flex flex-col space-y-2">
                  <Button
                    onClick={handleRegisterDevice}
                    disabled={!deviceId || !isConnected || createDeviceMutation.isPending}
                    className="bg-primary hover:bg-primaryDark"
                    data-testid="button-register-device"
                  >
                    {createDeviceMutation.isPending ? (
                      <>
                        <span className="material-icons text-sm mr-2 animate-spin">hourglass_empty</span>
                        Registering...
                      </>
                    ) : (
                      <>
                        <span className="material-icons text-sm mr-2">add_circle</span>
                        Register Device
                      </>
                    )}
                  </Button>
                  {!isConnected && (
                    <p className="text-sm text-warning">
                      Please wait for connection to establish before registering.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-success text-sm">
                    <span className="material-icons text-sm">check_circle</span>
                    <span>Device registered successfully</span>
                  </div>
                  
                  <Button
                    onClick={handleRequestPermissions}
                    variant="outline"
                    data-testid="button-request-permissions"
                  >
                    <span className="material-icons text-sm mr-2">security</span>
                    Request Permissions
                  </Button>
                  
                  {!isActive ? (
                    <Button
                      onClick={handleStartSensors}
                      className="bg-success hover:bg-green-600"
                      data-testid="button-start-sensors"
                    >
                      <span className="material-icons text-sm mr-2">play_arrow</span>
                      Start Sensors
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopSensors}
                      variant="destructive"
                      data-testid="button-stop-sensors"
                    >
                      <span className="material-icons text-sm mr-2">stop</span>
                      Stop Sensors
                    </Button>
                  )}
                  
                  {isActive && (
                    <div className="flex items-center space-x-2 text-success text-sm">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      <span data-testid="streaming-status">
                        {isStreaming ? 'Streaming data to dashboard' : 'Sensors active (not streaming)'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
