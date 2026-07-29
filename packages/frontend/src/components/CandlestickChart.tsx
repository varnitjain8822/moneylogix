import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';

interface CandlestickChartProps {
  data: { time: string; open: number; high: number; low: number; close: number }[];
  height?: number;
}

export default function CandlestickChart({ data, height = 300 }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#cbd5e1', // text-slate-300
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', // green-500
      downColor: '#ef4444', // red-500
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    if (data && data.length > 0) {
      // lightweight-charts requires strictly ascending time order
      const sortedData = [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      
      // Ensure unique time values to prevent crashes
      const uniqueData = sortedData.filter((item, pos, ary) => {
        return !pos || item.time !== ary[pos - 1].time;
      });

      candleSeries.setData(uniqueData);
      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height]);

  return <div ref={chartContainerRef} className="w-full" style={{ height }} />;
}
