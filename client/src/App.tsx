import React, { useState, useEffect } from "react";
import { StudentLogin } from "./pages/StudentLogin";
import { StudentAssessment } from "./pages/StudentAssessment";
import { StudentPracticeReview } from "./pages/StudentPracticeReview";
import { AdminLogin } from "./pages/AdminLogin";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminAssessmentEditor } from "./pages/AdminAssessmentEditor";
import { AdminLiveMonitor } from "./pages/AdminLiveMonitor";
import { AdminGradebook } from "./pages/AdminGradebook";
import { api } from "./services/api";

type AppView =
  | "student_login"
  | "student_assessment"
  | "student_review"
  | "admin_login"
  | "admin_dashboard"
  | "admin_editor"
  | "admin_monitor"
  | "admin_gradebook";

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>("student_login");
  const [activeAttemptId, setActiveAttemptId] = useState<string>("");
  const [activeAssessmentId, setActiveAssessmentId] = useState<string>("");

  useEffect(() => {
    // Check if student attempt was saved in session
    const savedAttempt = sessionStorage.getItem("sql_attempt_id");
    if (savedAttempt) {
      setActiveAttemptId(savedAttempt);
      setCurrentView("student_assessment");
    }
  }, []);

  const handleStudentLoginSuccess = (attemptId: string) => {
    setActiveAttemptId(attemptId);
    sessionStorage.setItem("sql_attempt_id", attemptId);
    setCurrentView("student_assessment");
  };

  const handleAssessmentFinished = () => {
    sessionStorage.removeItem("sql_attempt_id");
    setCurrentView("student_review");
  };

  const handleAdminSelectAssessment = (
    id: string,
    view: "editor" | "monitor" | "gradebook"
  ) => {
    setActiveAssessmentId(id);
    if (view === "editor") setCurrentView("admin_editor");
    else if (view === "monitor") setCurrentView("admin_monitor");
    else if (view === "gradebook") setCurrentView("admin_gradebook");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {currentView === "student_login" && (
        <StudentLogin
          onLoginSuccess={handleStudentLoginSuccess}
          onGoToAdmin={() => setCurrentView("admin_login")}
        />
      )}

      {currentView === "student_assessment" && (
        <StudentAssessment
          attemptId={activeAttemptId}
          onAssessmentFinished={handleAssessmentFinished}
        />
      )}

      {currentView === "student_review" && (
        <StudentPracticeReview
          onReturnToLogin={() => setCurrentView("student_login")}
        />
      )}

      {currentView === "admin_login" && (
        <AdminLogin
          onLoginSuccess={() => setCurrentView("admin_dashboard")}
          onGoToStudent={() => setCurrentView("student_login")}
        />
      )}

      {currentView === "admin_dashboard" && (
        <AdminDashboard
          onSelectAssessment={handleAdminSelectAssessment}
          onLogout={() => {
            localStorage.removeItem("sql_admin_token");
            setCurrentView("admin_login");
          }}
          onGoToStudent={() => setCurrentView("student_login")}
        />
      )}

      {currentView === "admin_editor" && (
        <AdminAssessmentEditor
          assessmentId={activeAssessmentId}
          onBack={() => setCurrentView("admin_dashboard")}
        />
      )}

      {currentView === "admin_monitor" && (
        <AdminLiveMonitor
          assessmentId={activeAssessmentId}
          onBack={() => setCurrentView("admin_dashboard")}
        />
      )}

      {currentView === "admin_gradebook" && (
        <AdminGradebook
          assessmentId={activeAssessmentId}
          onBack={() => setCurrentView("admin_dashboard")}
        />
      )}
    </div>
  );
};

export default App;
