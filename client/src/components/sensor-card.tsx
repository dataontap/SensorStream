import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RealTimeChart } from './real-time-chart';
import { SensorReading } from '@shared/schema';
import { useEffect, useState } from 'react';

interface DataPoint {
  timestamp: number;
  value: number;
}

interface SensorCardProps {
  title: string;
  icon: string;
  value: number | null;
  unit: string;
  color: string;
  isActive: boolean;
  readings?: SensorReading[];
  dataKey?: string;
}

export function SensorCard({ 
  title, 
  icon, 
  value, 
  unit, 
  color, 
  isActive,
  readings = [],
  dataKey 
}: SensorCardProps) {
  const [chartData, setChartData] = useState<DataPoint[]>([]);

  useEffect(() => {
    if (!dataKey || !readings.length) return;

    const data = readings
      .map(reading => {
        let val = 0;
        if (dataKey === 'lightLevel' && reading.lightLevel !== null) {
          val = reading.lightLevel;
        } else if (dataKey === 'airPressure' && reading.airPressure !== null) {
          val = reading.airPressure;
        } else if (dataKey.startsWith('accelerometer') && reading.accelerometer) {
          const axis = dataKey.split('.')[1] as 'x' | 'y' | 'z';
          val = reading.accelerometer[axis];
        } else if (dataKey.startsWith('magnetometer') && reading.magnetometer) {
          const axis = dataKey.split('.')[1] as 'x' | 'y' | 'z';
          val = reading.magnetometer[axis];
        }

        return {
          timestamp: new Date(reading.timestamp || Date.now()).getTime(),
          value: val,
        };
      })
      .filter(point => !isNaN(point.value))
      .sort((a, b) => a.timestamp - b.timestamp);

    setChartData(data);
  }, [readings, dataKey]);

  return (
    <Card className="bg-white border border-gray-200 shadow-sm" data-testid={`sensor-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-icons text-primary text-xl">{icon}</span>
            <CardTitle className="text-lg font-medium text-secondary">{title}</CardTitle>
          </div>
          <div 
            className={`w-3 h-3 rounded-full ${
              isActive ? 'bg-success animate-pulse' : 'bg-gray-400'
            }`}
            data-testid={`status-indicator-${title.toLowerCase().replace(/\s+/g, '-')}`}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="text-center mb-6">
          <p className="text-4xl font-bold mb-2" style={{ color }} data-testid={`sensor-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {value !== null ? value.toFixed(2) : '--'}
          </p>
          <p className="text-sm text-gray-500">{unit}</p>
        </div>

        <div className="h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
          {chartData.length > 1 ? (
            <RealTimeChart 
              data={chartData} 
              color={color} 
              height={120}
              unit={unit}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <span className="material-icons text-gray-400 text-3xl mb-2">show_chart</span>
                <p className="text-sm text-gray-500">Collecting data...</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}