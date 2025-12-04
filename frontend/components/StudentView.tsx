import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, LogOut } from 'lucide-react';

interface Session {
  session_id: number;
  session_code: string;
  course_name: string;
  anon_id: number;
}

interface StudentViewProps {
  session: Session;
  clickCount: number;
  onConfusionClick: (newCount: number) => void;
  onExit: () => void;
}

interface StudentViewPropsExtended extends StudentViewProps {
  isSessionActive?: boolean;
}

export function StudentView({ session, clickCount, onConfusionClick, onExit, isSessionActive = true }: StudentViewPropsExtended) {
  const [note, setNote] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [active, setActive] = useState<boolean>(isSessionActive ?? false);

  // Poll session metadata so students see start/end in near real-time
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/sessions/${session.session_id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        if (typeof data.is_active === 'boolean') {
          setActive(data.is_active);
        }
      } catch (err) {
        // ignore network errors for polling
      }
    };

    // initial check and interval
    check();
    const id = setInterval(check, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [session.session_id]);

  const handleConfusionClick = async () => {
    if (!active) {
      // defensively prevent clicks when session is inactive
      alert('Session is not active. You cannot submit feedback yet.');
      return;
    }
    try {
      // 1. Send click to backend
      const clickRes = await fetch(
        `http://localhost:3001/api/sessions/${session.session_id}/click`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anon_id: session.anon_id })
        }
      );

      const clickData = await clickRes.json();
      if (!clickRes.ok) {
        const message = clickData?.error || 'Server rejected click';
        // Surface server message to user for debugging
        throw new Error(message);
      }

      // 2. If note exists, send it
      if (note.trim() !== "") {
        await fetch(
          `http://localhost:3001/api/sessions/${session.session_id}/notes`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              anon_id: session.anon_id,
              note: note.trim()
            })
          }
        );
      }

      // 3. Update counter
      onConfusionClick(clickData.student_click_count);

      // 4. UI feedback
      setShowFeedback(true);
      setNote("");
      setTimeout(() => setShowFeedback(false), 2000);

    } catch (err: any) {
      console.error('Confusion click error:', err);
      // show server-provided message if available
      const msg = err?.message || 'Error sending feedback';
      alert(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{session.course_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm">Session Code:</span>
              <Badge variant="secondary" className="tracking-wider">
                {session.session_code}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onExit}>
            <LogOut className="h-4 w-4 mr-2" />
            Exit
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-6">
          {/* Confusion Button */}
          <Card className="p-12 text-center bg-white shadow-xl">
            <div className="space-y-6">
              <h2 className="text-muted-foreground">Feeling lost? Let your TA know.</h2>

              {!active && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">Session has not started yet</div>
              )}

              <Button
                onClick={handleConfusionClick}
                size="lg"
                className="h-40 w-40 rounded-full mx-auto"
                variant="destructive"
                disabled={!active}
              >
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-12 w-12" />
                  <span className="text-xl">I'm Confused</span>
                </div>
              </Button>

              {/* Click Counter */}
              <div className="pt-4">
                <p className="text-muted-foreground">
                  You've indicated confusion <span className="font-semibold text-foreground">{clickCount}</span> {clickCount === 1 ? 'time' : 'times'}
                </p>
              </div>

              {/* Feedback Animation */}
              {showFeedback && (
                <div className="text-green-600 animate-in fade-in duration-300">
                  ✓ Feedback sent
                </div>
              )}
            </div>
          </Card>

          {/* Optional Note */}
          <Card className="p-6 bg-white shadow-md">
            <label htmlFor="note" className="block mb-3">
              Optional: Add a quick note (what's confusing?)
            </label>
            <Textarea
              id="note"
              placeholder="e.g., Didn't understand example 2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <p className="text-sm text-muted-foreground">
              Your feedback is anonymous and helps your TA improve the session
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
