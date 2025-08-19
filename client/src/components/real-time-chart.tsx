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
  unit?: string;
}

export function RealTimeChart({ data, color, height = 120, maxPoints = 200, unit }: RealTimeChartProps) {
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

    // Get the last maxPoints data points for real-time visualization
    const points = data.slice(-maxPoints);
    
    // Show only data from the last 2 minutes for more real-time feel
    const now = Date.now();
    const recentPoints = points.filter(p => (now - p.timestamp) < 120000); // Last 2 minutes
    const displayPoints = recentPoints.length > 10 ? recentPoints : points;
    
    // Calculate bounds using display points
    const values = displayPoints.map(p => p.value);
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

    displayPoints.forEach((point, index) => {
      const x = (index / (displayPoints.length - 1)) * rect.width;
      const y = rect.height - ((point.value - minValue) / valueRange) * rect.height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw Y-axis unit label at top left corner
    if (unit) {
      ctx.fillStyle = '#6b7280'; // gray-500
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(unit, 8, 8);
    }

    // Draw points - only show recent points for cleaner real-time visualization
    ctx.fillStyle = color;
    displayPoints.forEach((point, index) => {
      const x = (index / (displayPoints.length - 1)) * rect.width;
      const y = rect.height - ((point.value - minValue) / valueRange) * rect.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

  }, [data, color, height, maxPoints]);

  // Add animation frame for smoother real-time updates
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      // Chart will re-render when data prop changes
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: `${height}px` }}
      data-testid="real-time-chart"
    />
  );
}
