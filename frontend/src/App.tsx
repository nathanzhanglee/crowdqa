import { useState } from 'react';
import { JoinSession } from '../components/JoinSession';
import { StudentView } from '../components/StudentView';
import { SessionCreator } from '../components/SessionCreator';
import { TADashboard } from '../components/TADashboard';
import { SummaryReport } from '../components/SummaryReport';
import { Button } from '../components/ui/button';

type View =
  | 'home'
  | 'student-join'
  | 'student-active'
  | 'ta-create'
  | 'ta-dashboard'
  | 'ta-summary';

interface BackendSession {
  session_id: number;
  session_code: string;
  course_name: string;
  recitation_date: string;
  duration_minutes: number;
  ta_name: string;
  start_time: string | null;
  end_time: string | null;
  is_active?: boolean;
}

interface StudentSession {
  session_id: number;
  anon_id: number;
  course_name: string;
  session_code: string;
  is_active?: boolean;
}

export default function App() {
  const [view, setView] = useState<View>('home');

  // TA session info
  const [currentSession, setCurrentSession] = useState<BackendSession | null>(null);

  // Student session info
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);

  // Student click count
  const [studentClickCount, setStudentClickCount] = useState(0);

  // Store the TA session_id for Summary Report
  const [summarySessionId, setSummarySessionId] = useState<number | null>(null);

  //--------------------------------------------------------------------
  // TA FLOW
  //--------------------------------------------------------------------

  const handleCreateSession = (session: BackendSession) => {
    setCurrentSession(session);
    setView('ta-dashboard');
  };

  const handleEndSession = async () => {
    if (!currentSession) return;

    try {
      const res = await fetch(`https://crowdqa-hxre.onrender.com/api/sessions/${currentSession.session_id}/end`, {
        method: 'PUT'
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to end session');
      }

      // optionally we could read returned session from server
      setSummarySessionId(currentSession.session_id);
      setView('ta-summary');
    } catch (err) {
      console.error(err);
      alert('Error ending session');
    }
  };

  //--------------------------------------------------------------------
  // STUDENT FLOW
  //--------------------------------------------------------------------

  const handleJoinSuccess = (data: {
    session_id: number;
    anon_id: number;
    course_name: string;
    duration_minutes: number;
    start_time: string | null;
    end_time: string | null;
    session_code?: string;
    is_active?: boolean;
  }) => {
    setStudentSession({
      session_id: data.session_id,
      anon_id: data.anon_id,
      course_name: data.course_name,
      session_code: data.session_code ?? data.session_id.toString()
      , is_active: data.is_active ?? false
    });

    setStudentClickCount(0);
    setView('student-active');
  };

  //--------------------------------------------------------------------
  // RENDER
  //--------------------------------------------------------------------

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <h1 className="text-center mb-8">Confusion Tracker</h1>

              <div className="space-y-4">
                <div>
                  <h2 className="mb-4">Student</h2>
                  <Button
                    onClick={() => setView('student-join')}
                    className="w-full"
                    size="lg"
                  >
                    Join Session
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <h2 className="mb-4">TA / Professor</h2>
                  <div className="space-y-2">
                    <Button
                      onClick={() => setView('ta-create')}
                      className="w-full"
                      variant="outline"
                      size="lg"
                    >
                      Create New Session
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      // --------------------------------------------------------------
      // Student Join
      // --------------------------------------------------------------
      case 'student-join':
        return (
          <JoinSession
            onBack={() => setView('home')}
            onJoinSuccess={handleJoinSuccess}
          />
        );

      // --------------------------------------------------------------
      // Student Active Session View
      // --------------------------------------------------------------
      case 'student-active':
        if (!studentSession) return null;

        return (
          <StudentView
            session={{
              session_id: studentSession.session_id,
              anon_id: studentSession.anon_id,
              course_name: studentSession.course_name,
              session_code: studentSession.session_code
            }}
            isSessionActive={studentSession.is_active ?? false}
            clickCount={studentClickCount}
            onConfusionClick={(newCount) => setStudentClickCount(newCount)}
            onExit={() => {
              setStudentSession(null);
              setView('home');
            }}
          />
        );

      // --------------------------------------------------------------
      // TA Create Session
      // --------------------------------------------------------------
      case 'ta-create':
        return (
          <SessionCreator
            onCreateSession={handleCreateSession}
            onBack={() => setView('home')}
          />
        );

      // --------------------------------------------------------------
      // TA Live Dashboard
      // --------------------------------------------------------------
      case 'ta-dashboard':
        if (!currentSession) return null;

        return (
          <TADashboard
            session={currentSession}
            onBack={() => setView('home')}
            onViewSummary={handleEndSession}
          />
        );

      // --------------------------------------------------------------
      // TA Summary Report
      // --------------------------------------------------------------
      case 'ta-summary':
        if (!summarySessionId) return null;

        return (
          <SummaryReport
            sessionId={summarySessionId}
            onBack={() => setView('ta-dashboard')}
            onHome={() => setView('home')}
          />
        );
    }
  };

  return renderView();
}
