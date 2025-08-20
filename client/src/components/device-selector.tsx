
import { Device } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface DeviceSelectorProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  onAddDevice: () => void;
  isConnected: boolean;
}

export function DeviceSelector({ 
  devices, 
  selectedDeviceId, 
  onSelectDevice, 
  onAddDevice,
  isConnected 
}: DeviceSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusColor = (device: Device) => {
    if (device.isActive === "true") return 'bg-success';
    const lastSeen = new Date(device.lastSeen || 0);
    const timeDiff = Date.now() - lastSeen.getTime();
    return timeDiff > 60000 ? 'bg-gray-400' : 'bg-warning'; // 1 minute threshold
  };

  const getLastSeenText = (device: Device) => {
    if (!device.lastSeen) return 'Never seen';
    const lastSeen = new Date(device.lastSeen);
    const timeDiff = Date.now() - lastSeen.getTime();

    if (timeDiff < 10000) return 'Just now';
    if (timeDiff < 60000) return `${Math.floor(timeDiff / 1000)} seconds ago`;
    if (timeDiff < 3600000) return `${Math.floor(timeDiff / 60000)} minutes ago`;
    return `${Math.floor(timeDiff / 3600000)} hours ago`;
  };

  return (
    <aside 
      className={`bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-12'
      }`} 
      data-testid="device-selector"
    >
      <div className="p-6">
        <div className={`flex items-center mb-4 ${
          !isExpanded ? 'flex-col space-y-2' : 'justify-between'
        }`}>
          {isExpanded && (
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-medium text-secondary">Devices</h2>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                isConnected ? 'bg-primaryDark' : 'bg-gray-500'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-success animate-pulse' : 'bg-gray-300'
                }`} />
                <span className="text-sm text-white" data-testid="connection-status">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          )}
          
          {!isExpanded && (
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              isConnected ? 'bg-primaryDark' : 'bg-gray-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-success animate-pulse' : 'bg-gray-300'
              }`} />
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 flex-shrink-0"
            data-testid="collapse-toggle"
          >
            {isExpanded ? (
              <ChevronLeft className="h-6 w-6" />
            ) : (
              <ChevronRight className="h-6 w-6" />
            )}
          </Button>
        </div>

        {isExpanded && (
          <>
            <div className="space-y-3">
              {devices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="material-icons text-4xl mb-2">devices</span>
                  <p className="text-sm">No devices connected</p>
                </div>
              ) : (
                devices.map((device) => (
                  <div
                    key={device.id}
                    className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedDeviceId === device.id
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => onSelectDevice(device.id)}
                    data-testid={`device-item-${device.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="material-icons text-primary">
                          {device.userAgent?.includes('Mobile') ? 'smartphone' : 
                           device.userAgent?.includes('Tablet') ? 'tablet_android' : 'computer'}
                        </span>
                        <div>
                          <p className="font-medium text-sm" data-testid={`device-name-${device.id}`}>
                            {device.name}
                          </p>
                          <p className="text-xs text-gray-500" data-testid={`device-last-seen-${device.id}`}>
                            Last seen: {getLastSeenText(device)}
                          </p>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(device)}`} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <Link href="/device">
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center space-x-2"
                  data-testid="button-view-live-metrics"
                >
                  <span className="material-icons text-sm">show_chart</span>
                  <span>View Live Metrics</span>
                </Button>
              </Link>
              <Button
                onClick={onAddDevice}
                className="w-full bg-primary hover:bg-primaryDark text-white"
                disabled={!isConnected}
                data-testid="button-add-device"
              >
                <span className="material-icons text-sm mr-2">add</span>
                Add Device
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-secondary mb-3">Data Controls</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="form-checkbox text-primary" 
                    defaultChecked 
                    data-testid="checkbox-realtime-updates"
                  />
                  <span className="ml-2 text-sm">Real-time Updates</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="form-checkbox text-primary" 
                    defaultChecked 
                    data-testid="checkbox-data-logging"
                  />
                  <span className="ml-2 text-sm">Data Logging</span>
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Update Rate</span>
                  <select 
                    className="text-sm border border-gray-300 rounded px-2 py-1" 
                    defaultValue="200ms"
                    data-testid="select-update-rate"
                  >
                    <option value="100ms">100ms</option>
                    <option value="200ms">200ms</option>
                    <option value="500ms">500ms</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {!isExpanded && devices.length > 0 && (
          <div className="space-y-2 flex flex-col items-center">
            {devices.map((device) => (
              <div
                key={device.id}
                className={`p-2 border rounded-lg cursor-pointer transition-colors relative ${
                  selectedDeviceId === device.id
                    ? 'border-primary bg-blue-50'
                    : 'border-gray-200'
                }`}
                onClick={() => onSelectDevice(device.id)}
                data-testid={`device-item-collapsed-${device.id}`}
                title={device.name}
              >
                <div className="flex items-center justify-center">
                  <span className="material-icons text-primary">
                    {device.userAgent?.includes('Mobile') ? 'smartphone' : 
                     device.userAgent?.includes('Tablet') ? 'tablet_android' : 'computer'}
                  </span>
                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${getStatusColor(device)}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
