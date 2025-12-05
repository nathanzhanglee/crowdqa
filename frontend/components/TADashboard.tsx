import { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface Session {
  session_id: number;
  session_code: string;
  course_name: string;
  duration_minutes: number;
  start_time: string;
}

interface TADashboardProps {
  session: Session;
  onBack: () => void;
  onViewSummary: () => void;
}

export function TADashboard({ session, onBack, onViewSummary }: TADashboardProps) {
  const [clicks, setClicks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [bins, setBins] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);


  useEffect(() => {
    const fetchAll = async () => {
      const [clickRes, noteRes, binRes, studentRes] = await Promise.all([
        fetch(`https://crowdqa-hxre.onrender.com/api/sessions/${session.session_id}/clicks`).then(r => r.json()),
        fetch(`https://crowdqa-hxre.onrender.com/api/sessions/${session.session_id}/notes`).then(r => r.json()),
        fetch(`https://crowdqa-hxre.onrender.com/api/sessions/${session.session_id}/click-intervals`).then(r => r.json()),
        fetch(`https://crowdqa-hxre.onrender.com/api/sessions/${session.session_id}/active-students`).then(r => r.json())
      ]);

      setClicks(clickRes.clicks || []);
      setNotes(noteRes.notes || []);
      setBins(binRes.bins || []);
      setTotalStudents(parseInt(studentRes.active_students ?? 0));
    };

    fetchAll();
  }, [session, refreshKey]);

  const chartData = useMemo(() => {
    return bins.map((b) => ({
      minute: b.bin_start_minute,
      count: b.click_count,
      label: `${b.bin_start_minute}-${b.bin_end_minute}`
    }));
  }, [bins]);

  const stats = useMemo(() => {
    const counts = chartData.map(d => d.count);
    const mean = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
    const variance = counts.length
      ? counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / counts.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + 1.2 * stdDev;

    const uniqueStudents = totalStudents;

    return {
      totalClicks: clicks.length,
      uniqueStudents,
      mean,
      stdDev,
      threshold,
      peakBins: chartData.filter(d => d.count >= threshold)
    };
  }, [chartData, clicks]);

  const notesWithTimestamps = useMemo(() => {
    const start = Date.parse(session.start_time);
    return notes
      .map(n => ({
        ...n,

        minutesElapsed: Math.floor((Date.parse(n.created_at) - start) / 60000)
              }))
      .sort((a, b) => a.minutesElapsed - b.minutesElapsed);
  }, [notes, session.start_time]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" variant="destructive" onClick={onViewSummary}>
              End Session & View Summary
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="mb-2">Live Dashboard</h1>
              <p className="text-muted-foreground">{session.course_name}</p>
            </div>
            <Badge variant="secondary" className="text-lg py-2 px-4 tracking-wider">
              {session.session_code}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Total Clicks</p>
              <p className="text-3xl">{stats.totalClicks}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Active Students</p>
              <p className="text-3xl">{stats.uniqueStudents}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Peak Intervals</p>
              <p className="text-3xl">{stats.peakBins.length}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Avg per Interval</p>
              <p className="text-3xl">{stats.mean.toFixed(1)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2>Confusion Heat Map</h2>
            <p className="text-sm text-muted-foreground">
              Red line indicates confusion threshold (mean + 1.2σ)
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <ReferenceLine y={stats.threshold} stroke="red" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {stats.peakBins.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-4">Peak Confusion Intervals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.peakBins.map((bin) => (
                <div key={bin.minute} className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    Minutes {bin.label}
                  </p>
                  <p className="text-2xl">{bin.count} events</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {notesWithTimestamps.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-4">Student Notes</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notesWithTimestamps.map((n, i) => (
                <div key={i} className="bg-gray-50 rounded p-3">
                  <Badge variant="secondary" className="text-xs mb-1">
                    {n.minutesElapsed} min
                  </Badge>
                  <p>{n.note}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
