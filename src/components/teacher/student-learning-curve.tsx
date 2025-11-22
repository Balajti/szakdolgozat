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

interface StudentSubmission {
  submittedAt: string;
  score: number;
  maxScore: number;
  unknownWords?: string[];
}

interface StudentLearningCurveProps {
  studentId: string;
  studentName: string;
}

export function StudentLearningCurve({ studentId, studentName }: StudentLearningCurveProps) {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubmissions = useCallback(async () => {
    try {
      const { client } = await import('@/lib/amplify-client');
      const response = await client.models.AssignmentSubmission.list({
        filter: { studentId: { eq: studentId } }
      });
      if (response.data) {
        const sorted = (response.data as unknown as StudentSubmission[]).sort((a, b) =>
          new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
        );
        setSubmissions(sorted);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  if (loading) {
    return <div>Loading learning curve...</div>;
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Learning Curve: {studentName}</CardTitle>
          <CardDescription>No submissions yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Student hasn&apos;t completed any assignments yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = {
    labels: submissions.map((s, index) => `Assignment ${index + 1}`),
    datasets: [
      {
        label: 'Score (%)',
        data: submissions.map((s) => Math.round((s.score / s.maxScore) * 100)),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'Unknown Words',
        data: submissions.map((s) => s.unknownWords?.length || 0),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.3,
        yAxisID: 'y1',
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
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
              if (context.datasetIndex === 0) {
                label += '%';
              }
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Score (%)',
        },
        min: 0,
        max: 100,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Unknown Words',
        },
        min: 0,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  // Calculate statistics
  const avgScore = Math.round(
    submissions.reduce((sum, s) => sum + (s.score / s.maxScore) * 100, 0) / submissions.length
  );
  const latestScore = Math.round(
    (submissions[submissions.length - 1].score / submissions[submissions.length - 1].maxScore) * 100
  );
  const trend = latestScore > avgScore ? 'improving' : latestScore < avgScore ? 'declining' : 'stable';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Curve: {studentName}</CardTitle>
        <CardDescription>
          Progress over {submissions.length} assignments • Average: {avgScore}% • Trend: {trend}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
