import { useEffect, useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Home } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface SummaryReportProps {
  sessionId: number;
  onBack: () => void;
  onHome: () => void;
}

interface SessionMeta {
  session_id: number;
  session_code: string;
  course_name: string;
  duration_minutes: number;
  ta_name: string;
  start_time: string;
}

interface NoteRecord {
  anon_id: number;
  note: string;
  created_at: string;
}

interface BinRecord {
  bin_start_minute: number;
  bin_end_minute: number;
  click_count: number;
  unique_students: number;
  percentage: number;
}

export function SummaryReport({ sessionId, onBack, onHome }: SummaryReportProps) {
  const [session, setSession] = useState<SessionMeta | null>(null);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [bins, setBins] = useState<BinRecord[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);

  useEffect(() => {
    const loadAll = async () => {
      const metaRes = await fetch(
        `http://localhost:3001/api/sessions/${sessionId}`
      ).then(r => r.json());

      const analysisRes = await fetch(
        `http://localhost:3001/api/sessions/${sessionId}/analysis`
      ).then(r => r.json());

      const noteRes = await fetch(
        `http://localhost:3001/api/sessions/${sessionId}/notes`
      ).then(r => r.json());

      setSession(metaRes);
      setNotes(noteRes.notes || []);
      setBins(analysisRes.bins || []);
      setTotalStudents(analysisRes.totalStudents ?? 0);
      setTotalClicks(analysisRes.totalClicks ?? 0);
    };

    loadAll();
  }, [sessionId]);

  const summary = useMemo(() => {
    if (!session) return null;

    const data = bins.map(b => ({
      minute: b.bin_start_minute,
      label: `${b.bin_start_minute}-${b.bin_end_minute}`,
      count: b.click_count,
      uniqueStudents: b.unique_students,
      percentage: b.percentage
    }));

    const counts = data.map(d => d.count);
    const mean =
      counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;

    const variance =
      counts.length
        ? counts.reduce((sum, val) => sum + (val - mean) ** 2, 0) /
          counts.length
        : 0;

    const stdDev = Math.sqrt(variance);
    const threshold = mean + 1.2 * stdDev;

    return { data, threshold, totalStudents };
  }, [bins, session, totalStudents]);

  if (!session || !summary) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>

            <Button variant="ghost" size="sm" onClick={onHome}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </div>
        </div>

        {/* TITLE */}
        <Card className="p-6">
          <h1 className="mb-2">Post-Session Summary Report</h1>
          <p className="text-muted-foreground">{session.course_name}</p>
          <p className="text-sm text-muted-foreground mt-1">Instructor: {session.ta_name}</p>
        </Card>

        {/* STATS */}
        <Card className="p-6">
          <h2 className="mb-4">Session Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Total Events</p>
              <p className="text-3xl">{totalClicks}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Total Students</p>
              <p className="text-3xl">{summary.totalStudents}</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Avg per Student</p>
              <p className="text-3xl">
                {summary.totalStudents > 0
                  ? (totalClicks / summary.totalStudents).toFixed(1)
                  : 0}
              </p>
            </div>

            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Peak Confusion</p>
              <p className="text-3xl">
                {Math.max(...summary.data.map(d => d.percentage)).toFixed(0)}%
              </p>
            </div>
          </div>
        </Card>

        {/* BAR CHART */}
        <Card className="p-6">
          <h2 className="mb-4">Confusion Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count">
                  {summary.data.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.count >= summary.threshold ? "#ef4444" : "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* INTERVAL ANALYSIS */}
        <Card className="p-6">
          <h2 className="mb-4">Interval Analysis</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Interval</th>
                <th className="text-right p-3">Events</th>
                <th className="text-right p-3">Students</th>
                <th className="text-right p-3">% of Class</th>
                <th className="text-center p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.data.map((d, idx) => {
                const high = d.count >= summary.threshold;
                return (
                  <tr key={idx} className={`border-b ${high ? "bg-red-50" : ""}`}>
                    <td className="p-3">{d.label}</td>
                    <td className="text-right p-3">{d.count}</td>
                    <td className="text-right p-3">{d.uniqueStudents}</td>
                    <td className="text-right p-3">{d.percentage.toFixed(1)}%</td>
                    <td className="text-center p-3">
                      {high ? (
                        <Badge variant="destructive">High</Badge>
                      ) : d.count > 0 ? (
                        <Badge variant="secondary">Normal</Badge>
                      ) : (
                        <Badge variant="outline">Clear</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* INSIGHTS */}
        <Card className="p-6">
          <h2 className="mb-4">Key Insights</h2>
          <div className="space-y-3">
            {summary.data.some(d => d.count >= summary.threshold) ? (
              summary.data
                .filter(d => d.count >= summary.threshold)
                .map((peak, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 border-l-4 border-red-500 p-4 rounded"
                  >
                    <p>
                      <span className="font-semibold">
                        Peak at {peak.label}:
                      </span>{" "}
                      {peak.count} events ({peak.percentage.toFixed(1)}% of class)
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Consider reviewing this topic in future sessions.
                    </p>
                  </div>
                ))
            ) : (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p>No significant confusion spikes detected.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
