import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Copy, Check } from 'lucide-react';

interface BackendSession {
  session_id: number;
  session_code: string;
  course_name: string;
  recitation_date: string;
  duration_minutes: number;
  ta_name: string;
  start_time: string;
  end_time: string;
}

interface SessionCreatorProps {
  onCreateSession: (session: BackendSession) => void;
  onBack: () => void;
}

export function SessionCreator({ onCreateSession, onBack }: SessionCreatorProps) {
  const [courseName, setCourseName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('60');
  const [taName, setTaName] = useState('');
  const [generatedSession, setGeneratedSession] = useState<BackendSession | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3001/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_name: courseName,
          recitation_date: date,
          duration_minutes: parseInt(duration),
          ta_name: taName
        })
      });

      if (!res.ok) throw new Error("Failed to create session");

      const data = await res.json();

      const startTime = new Date(date + "T00:00:00Z");  // add Z for UTC
      const endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);

      setGeneratedSession({
        session_id: data.session_id,
        session_code: data.session_code,
        course_name: courseName,
        recitation_date: date,
        duration_minutes: parseInt(duration),
        ta_name: taName,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });

    } catch (err) {
      console.error(err);
      alert("Error creating session.");
    }
  };

  const handleStartSession = () => {
    // Call server to mark session as started, then navigate to dashboard
    const doStart = async () => {
      if (!generatedSession) return;
      try {
        const res = await fetch(`http://localhost:3001/api/sessions/${generatedSession.session_id}/start`, {
          method: 'PUT'
        });

        if (!res.ok) throw new Error('Failed to start session');

        const data = await res.json();
        // server returns { success: true, session: { ... } }
        const sessionFromServer = data.session ?? generatedSession;
        onCreateSession(sessionFromServer);
      } catch (err) {
        console.error(err);
        alert('Error starting session');
      }
    };

    doStart();
  };

  const handleCopyCode = () => {
    if (generatedSession) {
      navigator.clipboard.writeText(generatedSession.session_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <Card className="p-8 max-w-2xl w-full">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-center">Create New Session</h1>
        </div>

        {!generatedSession ? (
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block mb-2">Course Name</label>
              <Input
                type="text"
                placeholder="e.g., CS 101 - Intro to Programming"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-2">Recitation Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-2">Duration (minutes)</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="15"
                max="180"
                required
              />
            </div>

            <div>
              <label className="block mb-2">TA Name</label>
              <Input
                type="text"
                placeholder="Your name"
                value={taName}
                onChange={(e) => setTaName(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Generate Session Code
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
              <p className="mb-3">Session Code Generated</p>
              <div className="flex items-center justify-center gap-3">
                <Badge variant="secondary" className="text-4xl py-3 px-6 tracking-widest">
                  {generatedSession.session_code}
                </Badge>
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Share this code with your students
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-3">
              <h3>Session Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course:</span>
                  <span>{generatedSession.course_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{new Date(generatedSession.recitation_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{generatedSession.duration_minutes} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TA:</span>
                  <span>{generatedSession.ta_name}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setGeneratedSession(null)}>
                Create Another
              </Button>
              <Button className="flex-1" size="lg" onClick={handleStartSession}>
                Start Session & View Dashboard
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
