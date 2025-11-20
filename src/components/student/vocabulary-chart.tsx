'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface VocabularyProgress {
  date: string;
  knownWords: number;
  learningWords: number;
  unknownWords: number;
  newWordsToday: number;
}

interface VocabularyChartProps {
  studentId: string;
  days?: number;
}

export function VocabularyChart({ studentId, days = 30 }: VocabularyChartProps) {
  const [progressData, setProgressData] = useState<VocabularyProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProgressData = useCallback(async () => {
    try {
      const { generateClient } = await import('aws-amplify/api');
      const client = generateClient();
      const response = await client.models.VocabularyProgress.list({
        filter: { studentId: { eq: studentId } }
      });
      if (response.data) {
        // Take last N days as specified by the days parameter
        const allData = response.data as VocabularyProgress[];
        const sorted = allData.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ).slice(-days);
        setProgressData(sorted);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading vocabulary progress:', error);
      setLoading(false);
    }
  }, [studentId, days]);

  useEffect(() => {
    loadProgressData();
  }, [loadProgressData]);

  if (loading) {
    return <div>Loading chart...</div>;
  }

  // Sort by date and take last N days
  const sortedData = [...progressData]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-days);

  const chartData = {
    labels: sortedData.map((d) => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Known Words',
        data: sortedData.map((d) => d.knownWords),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Learning Words',
        data: sortedData.map((d) => d.learningWords),
        borderColor: 'rgb(234, 179, 8)',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        tension: 0.3,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 10,
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vocabulary Growth</CardTitle>
        <CardDescription>Track your progress over the last {days} days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
