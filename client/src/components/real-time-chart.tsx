import { useEffect, useRef } from 'react';

interface DataPoint {
  timestamp: number;
  value: number;
}

interface RealTimeChartProps {
  data: DataPoint[];
  color: string;
  height?: number;
  maxPoints?: number;
}

export function RealTimeChart({ data, color, height = 120, maxPoints = 50 }: RealTimeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (data.length < 2) return;

    // Get the last maxPoints data points
    const points = data.slice(-maxPoints);
    
    // Calculate bounds
    const values = points.map(p => p.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (rect.height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Draw the line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    points.forEach((point, index) => {
      const x = (index / (points.length - 1)) * rect.width;
      const y = rect.height - ((point.value - minValue) / valueRange) * rect.height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = color;
    points.forEach((point, index) => {
      const x = (index / (points.length - 1)) * rect.width;
      const y = rect.height - ((point.value - minValue) / valueRange) * rect.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

  }, [data, color, height, maxPoints]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: `${height}px` }}
      data-testid="real-time-chart"
    />
  );
}
