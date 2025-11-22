'use client';

import { useEffect, useState, useCallback } from 'react';
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
      const { client } = await import('@/lib/amplify-client');
      
      const listProgressByStudent = /* GraphQL */ `
        query ListProgressByStudent($studentId: ID!) {
          listProgressByStudent(studentId: $studentId) {
            items {
              date
              knownWords
              learningWords
              unknownWords
              newWordsToday
            }
          }
        }
      `;

      const response = await client.graphql({
        query: listProgressByStudent,
        variables: { studentId }
      }) as { data: { listProgressByStudent: { items: VocabularyProgress[] } } };

      if (response.data?.listProgressByStudent?.items) {
        const allData = response.data.listProgressByStudent.items as VocabularyProgress[];
        const sorted = allData.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ).slice(-days);
        setProgressData(sorted);
      } else {
        setProgressData([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading vocabulary progress:', error);
      setProgressData([]);
      setLoading(false);
    }
  }, [studentId, days]);

  useEffect(() => {
    loadProgressData();
  }, [loadProgressData]);

  if (loading) {
    return <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">Grafikon betöltése...</div>;
  }

  if (progressData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-center">
        <div>
          <p className="text-muted-foreground">Még nincsenek szókincs adatok.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Olvass történeteket a fejlődés nyomon követéséhez!</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: progressData.map((d) => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Ismert szavak',
        data: progressData.map((d) => d.knownWords),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Tanulás alatt',
        data: progressData.map((d) => d.learningWords),
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
    <div className="h-[300px]">
      <Line data={chartData} options={options} />
    </div>
  );
}
