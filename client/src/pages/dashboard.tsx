import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { DeviceSelector } from '@/components/device-selector';
import { SensorCard } from '@/components/sensor-card';
import { LocationPredictor } from '@/components/location-predictor';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Device, SensorReading } from '@shared/schema';
import { useLocation } from 'wouter';
import { Link } from 'wouter';

export default function Dashboard() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const { isConnected, devices, latestReadings, sendMessage } = useWebSocket();
  const [, navigate] = useLocation();
  
  // Also fetch devices via REST API as fallback
  const { data: restDevices = [] } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
    refetchInterval: 2000, // Check device list every 2 seconds
  });
  
  // Combine WebSocket devices with REST API devices
  const allDevices = devices.length > 0 ? devices : restDevices;

  // Fetch recent readings for selected device - FAST refresh for real-time
  const { data: readings = [] } = useQuery<SensorReading[]>({
    queryKey: ['/api/devices', selectedDeviceId, 'readings'],
    enabled: !!selectedDeviceId,
    refetchInterval: 500, // Update every 500ms for near real-time
  });

  // Auto-select first device when devices load
  useEffect(() => {
    console.log('Dashboard devices updated:', allDevices);
    if (allDevices.length > 0 && !selectedDeviceId) {
      console.log('Auto-selecting device:', allDevices[0].id);
      setSelectedDeviceId(allDevices[0].id);
    }
  }, [allDevices, selectedDeviceId]);

  const selectedDevice = allDevices.find(d => d.id === selectedDeviceId);
  const latestReading = selectedDeviceId ? latestReadings.get(selectedDeviceId) : null;
  
  console.log('Dashboard state:', { 
    selectedDeviceId, 
    wsDevicesCount: devices.length,
    restDevicesCount: restDevices.length,
    allDevicesCount: allDevices.length,
    selectedDevice: selectedDevice?.name,
    hasLatestReading: !!latestReading,
    latestReadingData: latestReading 
  });

  const handleAddDevice = () => {
    navigate('/device');
  };

  const handleExportData = () => {
    if (!readings.length) return;
    
    const csvData = [
      ['Timestamp', 'Accel X', 'Accel Y', 'Accel Z', 'Mag X', 'Mag Y', 'Mag Z', 'Light', 'Pressure'],
      ...readings.map(r => [
        new Date(r.timestamp || Date.now()).toISOString(),
        r.accelerometer?.x || '',
        r.accelerometer?.y || '',
        r.accelerometer?.z || '',
        r.magnetometer?.x || '',
        r.magnetometer?.y || '',
        r.magnetometer?.z || '',
        r.lightLevel || '',
        r.airPressure || '',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor-data-${selectedDeviceId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg" data-testid="header">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="material-icons text-2xl">sensors</span>
              <h1 className="text-xl font-medium">Sensor Data Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/device">
                <Button variant="outline" className="flex items-center space-x-2" data-testid="button-view-live-metrics">
                  <span className="material-icons text-sm">show_chart</span>
                  <span>View Live Metrics</span>
                </Button>
              </Link>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                isConnected ? 'bg-primaryDark' : 'bg-gray-500'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-success animate-pulse' : 'bg-gray-300'
                }`} />
                <span className="text-sm" data-testid="header-connection-status">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <span className="material-icons cursor-pointer hover:bg-primaryDark p-2 rounded">
                settings
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <DeviceSelector
          devices={allDevices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          onAddDevice={handleAddDevice}
          isConnected={isConnected}
        />

        {/* Main Content */}
        <main className="flex-1 p-6" data-testid="main-content">
          {selectedDevice ? (
            <>
              {/* Device Info Header */}
              <Card className="mb-6" data-testid="device-info-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-medium text-secondary" data-testid="selected-device-name">
                        {selectedDevice.name}
                      </h2>
                      <p className="text-sm text-gray-500" data-testid="selected-device-id">
                        ID: {selectedDevice.id}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Status</p>
                        <span className={`text-sm font-medium ${
                          selectedDevice.isActive === "true" ? 'text-success' : 'text-gray-500'
                        }`} data-testid="device-status">
                          {selectedDevice.isActive === "true" ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sensor Data Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <SensorCard
                  title="Accelerometer X"
                  icon="speed"
                  value={latestReading?.accelerometer?.x || null}
                  unit="m/s²"
                  color="#F44336"
                  isActive={selectedDevice.isActive === "true"}
                  readings={readings}
                  dataKey="accelerometer.x"
                />
                
                <SensorCard
                  title="Accelerometer Y"
                  icon="speed"
                  value={latestReading?.accelerometer?.y || null}
                  unit="m/s²"
                  color="#4CAF50"
                  isActive={selectedDevice.isActive === "true"}
                  readings={readings}
                  dataKey="accelerometer.y"
                />
                
                <SensorCard
                  title="Accelerometer Z"
                  icon="speed"
                  value={latestReading?.accelerometer?.z || null}
                  unit="m/s²"
                  color="#1976D2"
                  isActive={selectedDevice.isActive === "true"}
                  readings={readings}
                  dataKey="accelerometer.z"
                />
                
                <SensorCard
                  title="Magnetometer"
                  icon="explore"
                  value={latestReading?.magnetometer ? 
                    Math.sqrt(
                      Math.pow(latestReading.magnetometer.x, 2) +
                      Math.pow(latestReading.magnetometer.y, 2) +
                      Math.pow(latestReading.magnetometer.z, 2)
                    ) : null
                  }
                  unit="μT"
                  color="#9C27B0"
                  isActive={selectedDevice.isActive === "true"}
                  readings={readings}
                  dataKey="magnetometer.x"
                />
                
                <SensorCard
                  title="Light Sensor"
                  icon="light_mode"
                  value={latestReading?.lightLevel || null}
                  unit="Lux"
                  color="#FF9800"
                  isActive={selectedDevice.isActive === "true"}
                  readings={readings}
                  dataKey="lightLevel"
                />
                
                <SensorCard
                  title="Air Pressure"
                  icon="air"
                  value={latestReading?.airPressure || null}
                  unit="hPa"
                  color="#00BCD4"
                  isActive={selectedDevice.isActive === "true"}
                  readings={readings}
                  dataKey="airPressure"
                />
              </div>

              {/* AI Location Prediction Section */}
              <div className="mb-6">
                <LocationPredictor 
                  deviceId={selectedDevice.id} 
                  deviceName={selectedDevice.name} 
                />
              </div>

              {/* Data Log Section */}
              <Card data-testid="data-log-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-secondary">Recent Data Log</h3>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleExportData}
                        variant="outline"
                        size="sm"
                        disabled={!readings.length}
                        data-testid="button-export-data"
                      >
                        <span className="material-icons text-sm mr-1">download</span>
                        Export
                      </Button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    {readings.length > 0 ? (
                      <table className="w-full text-sm" data-testid="data-log-table">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-3 font-medium text-gray-700">Timestamp</th>
                            <th className="text-left p-3 font-medium text-gray-700">Accel (X,Y,Z)</th>
                            <th className="text-left p-3 font-medium text-gray-700">Mag (X,Y,Z)</th>
                            <th className="text-left p-3 font-medium text-gray-700">Light</th>
                            <th className="text-left p-3 font-medium text-gray-700">Pressure</th>
                          </tr>
                        </thead>
                        <tbody>
                          {readings.slice(0, 10).map((reading) => (
                            <tr key={reading.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-3 text-gray-600" data-testid={`reading-timestamp-${reading.id}`}>
                                {new Date(reading.timestamp || Date.now()).toLocaleTimeString()}
                              </td>
                              <td className="p-3 font-mono text-xs" data-testid={`reading-accelerometer-${reading.id}`}>
                                {reading.accelerometer ? 
                                  `${reading.accelerometer.x.toFixed(2)}, ${reading.accelerometer.y.toFixed(2)}, ${reading.accelerometer.z.toFixed(2)}` : 
                                  '--'
                                }
                              </td>
                              <td className="p-3 font-mono text-xs" data-testid={`reading-magnetometer-${reading.id}`}>
                                {reading.magnetometer ? 
                                  `${reading.magnetometer.x.toFixed(1)}, ${reading.magnetometer.y.toFixed(1)}, ${reading.magnetometer.z.toFixed(1)}` : 
                                  '--'
                                }
                              </td>
                              <td className="p-3" data-testid={`reading-light-${reading.id}`}>
                                {reading.lightLevel ? `${reading.lightLevel.toFixed(0)} lx` : '--'}
                              </td>
                              <td className="p-3" data-testid={`reading-pressure-${reading.id}`}>
                                {reading.airPressure ? `${reading.airPressure.toFixed(2)} hPa` : '--'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8 text-gray-500" data-testid="no-data-message">
                        <span className="material-icons text-4xl mb-2">storage</span>
                        <p className="text-sm">No sensor data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-gray-500">
                <span className="material-icons text-6xl mb-4">devices</span>
                <p className="text-lg">Select a device to view sensor data</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
