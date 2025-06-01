import { useEffect, useRef } from 'react';
import { Strategy } from '@/lib/api/strategies';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface StrategyPerformanceChartProps {
  strategy: Strategy;
}

export function StrategyPerformanceChart({
  strategy,
}: StrategyPerformanceChartProps) {
  const chartRef = useRef<ChartJS>(null);

  // Mock performance data - replace with actual API data
  const performanceData = {
    labels: Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toLocaleDateString();
    }),
    returns: Array.from({ length: 30 }, () =>
      Number((Math.random() * 20 - 5).toFixed(2))
    ),
    drawdown: Array.from({ length: 30 }, () =>
      Number((Math.random() * -10).toFixed(2))
    ),
  };

  const data: ChartData<'line'> = {
    labels: performanceData.labels,
    datasets: [
      {
        label: 'Returns (%)',
        data: performanceData.returns,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.4,
      },
      {
        label: 'Drawdown (%)',
        data: performanceData.drawdown,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.4,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Strategy Performance',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          drawOnChartArea: true,
        },
        ticks: {
          callback: (value) => `${value}%`,
        },
      },
    },
  };

  useEffect(() => {
    // Update chart data when strategy changes
    if (chartRef.current) {
      chartRef.current.update();
    }
  }, [strategy]);

  return (
    <div className="w-full h-full">
      <Line ref={chartRef} options={options} data={data} />
    </div>
  );
} 