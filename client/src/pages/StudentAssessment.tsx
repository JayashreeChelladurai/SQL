import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { joinStudentRoom } from "../services/socket";
import {
  StudentAttemptSession,
  QuestionGradingResult,
  StudentQuestion,
} from "../types";
import { MarkdownView } from "../components/common/MarkdownView";
import { SchemaViewer } from "../components/common/SchemaViewer";
import { SqlMonacoEditor } from "../components/editor/SqlMonacoEditor";
import { SqlResultViewer } from "../components/editor/SqlResultViewer";
import { QuestionPalette } from "../components/palette/QuestionPalette";
import {
  Clock,
  Play,
  Send,
  Bookmark,
  CheckCircle2,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface StudentAssessmentProps {
  attemptId: string;
  onAssessmentFinished: () => void;
}

export const StudentAssessment: React.FC<StudentAssessmentProps> = ({
  attemptId,
  onAssessmentFinished,
}) => {
  const [session, setSession] = useState<StudentAttemptSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SQL code state per question
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);

  // Execution state
  const [gradingResult, setGradingResult] = useState<QuestionGradingResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer & Auto-save
  const [remainingSeconds, setRemainingSeconds] = useState(3600);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [leftTab, setLeftTab] = useState<"problem" | "schema">("problem");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const saveTimerRef = useRef<any>(null);

  // 1. Initial Load
  useEffect(() => {
    loadSession();
    joinStudentRoom(attemptId);
  }, [attemptId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const data = await api.getStudentAssessment(attemptId);
      setSession(data);
      setRemainingSeconds(data.remainingSeconds);
      setFlaggedQuestions(data.flaggedQuestions || []);

      // Initialize drafts map
      const initialDrafts: Record<string, string> = { ...data.drafts };
      data.questions.forEach((q) => {
        if (!initialDrafts[q.id]) {
          initialDrafts[q.id] = q.submission?.code || q.starterCode || "";
        }
      });
      setDrafts(initialDrafts);
    } catch (err: any) {
      setError(err.message || "Failed to load assessment.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Countdown Timer & Heartbeat (Anti-cheat & Immutability)
  useEffect(() => {
    if (!session || session.status !== "IN_PROGRESS") return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitOnTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Heartbeat every 20 seconds to keep server updated
    const heartbeatTimer = setInterval(() => {
      api.heartbeat(attemptId, remainingSeconds).catch(() => {});
    }, 20000);

    return () => {
      clearInterval(timer);
      clearInterval(heartbeatTimer);
    };
  }, [session, attemptId]);

  const handleAutoSubmitOnTimeUp = async () => {
    try {
      await api.finishAssessment(attemptId);
      onAssessmentFinished();
    } catch {
      onAssessmentFinished();
    }
  };

  // 3. Draft Auto-Saving (Debounced 2 seconds)
  const currentQ: StudentQuestion | undefined = session?.questions[currentIndex];
  const currentCode = currentQ ? drafts[currentQ.id] || "" : "";

  const handleCodeChange = (newCode: string) => {
    if (!currentQ) return;
    setDrafts((prev) => ({ ...prev, [currentQ.id]: newCode }));

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.saveDraft(attemptId, currentQ.id, newCode);
        setLastSavedTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
      } catch {}
    }, 2000);
  };

  // 4. Run Query (Sample / Public Test Cases Only)
  const handleRunQuery = async () => {
    if (!currentQ) return;
    setIsRunning(true);
    setGradingResult(null);

    try {
      const res = await api.runQuery(currentQ.id, currentCode);
      setGradingResult(res);
    } catch (err: any) {
      alert(err.message || "Query execution failed.");
    } finally {
      setIsRunning(false);
    }
  };

  // 5. Submit Question (Graded against ALL test cases)
  const handleFinalSubmitQuestion = async () => {
    if (!currentQ) return;
    setIsSubmitting(true);
    setGradingResult(null);

    try {
      const res = await api.submitQuery(attemptId, currentQ.id, currentCode);
      setGradingResult(res);

      // Update question submission state in session
      setSession((prev) => {
        if (!prev) return null;
        const updated = prev.questions.map((q) => {
          if (q.id === currentQ.id) {
            return {
              ...q,
              submission: {
                id: res.submissionId || "sub",
                code: currentCode,
                score: res.score,
                maxScore: res.maxScore,
                status: res.status,
                passedTestCases: res.passedTestCases,
                totalTestCases: res.totalTestCases,
              },
            };
          }
          return q;
        });
        return { ...prev, questions: updated };
      });
    } catch (err: any) {
      alert(err.message || "Failed to submit question.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Toggle Flag Question
  const handleToggleFlag = async () => {
    if (!currentQ) return;
    try {
      const res = await api.toggleFlag(attemptId, currentQ.id);
      setFlaggedQuestions(res.flaggedQuestions);
    } catch {}
  };

  // 7. Finish Assessment
  const handleFinishAssessment = async () => {
    try {
      // Save current draft
      if (currentQ) {
        await api.saveDraft(attemptId, currentQ.id, currentCode);
      }
      await api.finishAssessment(attemptId);
      onAssessmentFinished();
    } catch (err: any) {
      alert(err.message || "Failed to complete assessment.");
    }
  };

  // Switch question helper
  const goToQuestion = (index: number) => {
    // Flush draft before changing
    if (currentQ) {
      api.saveDraft(attemptId, currentQ.id, currentCode).catch(() => {});
    }
    setCurrentIndex(index);
    setGradingResult(null);
    setPaletteOpen(false);
  };

  // Timer format (HH:MM:SS)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400 mr-3" />
        Loading SQL Assessment Session...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-center max-w-md">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h2 className="text-base font-bold text-white">Assessment Error</h2>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const isFlagged = currentQ ? flaggedQuestions.includes(currentQ.id) : false;
  const isTimeCritical = remainingSeconds <= 300; // < 5 mins

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 font-sans selection:bg-sky-500/30">
      {/* ----------------- Top Navigation Bar ----------------- */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left: Assessment Title & Question Tag */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-white leading-tight">
                {session.assessmentTitle}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Candidate: {session.studentName} ({session.rollNo})
              </div>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800 hidden md:block" />

          {currentQ && (
            <div className="hidden md:flex items-center gap-2">
              <span className="font-bold text-xs text-sky-400">
                Q{currentIndex + 1}: {currentQ.title}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                  currentQ.difficulty === "HARD"
                    ? "bg-rose-950 text-rose-300"
                    : currentQ.difficulty === "EASY"
                    ? "bg-emerald-950 text-emerald-300"
                    : "bg-amber-950 text-amber-300"
                }`}
              >
                {currentQ.difficulty}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentQ.marks} Marks
              </span>
            </div>
          )}
        </div>

        {/* Right: Timer, Auto-save status, Palette button, Finish button */}
        <div className="flex items-center gap-3">
          {/* Auto-save status */}
          {lastSavedTime && (
            <span className="hidden lg:inline text-[11px] text-slate-500 font-mono">
              Auto-saved {lastSavedTime}
            </span>
          )}

          {/* Immutable Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-xs border ${
              isTimeCritical
                ? "bg-rose-950/60 border-rose-800 text-rose-400 animate-pulse"
                : "bg-slate-950 border-slate-800 text-sky-400"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          {/* Question Palette Toggle */}
          <button
            onClick={() => setPaletteOpen(!paletteOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <Menu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Palette</span>
          </button>

          {/* Finish Assessment Button */}
          <button
            onClick={() => setShowFinishModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Finish</span>
          </button>
        </div>
      </header>

      {/* ----------------- Main Split IDE Workspace ----------------- */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT PANE: Problem Description & Schema Explorer */}
        <div className="w-full md:w-5/12 flex flex-col border-r border-slate-800 bg-slate-950/80 overflow-hidden">
          {/* Left Tabs */}
          <div className="flex items-center justify-between p-2 bg-slate-900 border-b border-slate-800 shrink-0 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLeftTab("problem")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition ${
                  leftTab === "problem"
                    ? "bg-slate-800 text-sky-400 border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Description</span>
              </button>

              <button
                onClick={() => setLeftTab("schema")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition ${
                  leftTab === "schema"
                    ? "bg-slate-800 text-sky-400 border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Schema & Tables</span>
              </button>
            </div>

            {/* Flag / Review Toggle */}
            <button
              onClick={handleToggleFlag}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition ${
                isFlagged
                  ? "bg-purple-950 text-purple-300 border border-purple-800"
                  : "text-slate-400 hover:text-slate-200 bg-slate-800"
              }`}
            >
              <Bookmark className={`w-3 h-3 ${isFlagged ? "fill-purple-400" : ""}`} />
              <span>{isFlagged ? "Flagged" : "Flag for Review"}</span>
            </button>
          </div>

          {/* Left Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {leftTab === "problem" && currentQ && (
              <div>
                <h1 className="text-base font-bold text-white mb-2">
                  {currentQ.title}
                </h1>
                <MarkdownView content={currentQ.description} />
              </div>
            )}

            {leftTab === "schema" && currentQ && (
              <div>
                <div className="mb-2 text-xs font-semibold text-slate-300">
                  Database Schemas & Sample Rows
                </div>
                <SchemaViewer tables={currentQ.schemaOverview || []} />
              </div>
            )}
          </div>

          {/* Left Bottom Question Stepper */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
            <button
              disabled={currentIndex === 0}
              onClick={() => goToQuestion(currentIndex - 1)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="font-mono text-slate-400">
              Q{currentIndex + 1} of {session.questions.length}
            </span>

            <button
              disabled={currentIndex === session.questions.length - 1}
              onClick={() => goToQuestion(currentIndex + 1)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT PANE: Monaco SQL Editor & Execution Console */}
        <div className="w-full md:w-7/12 flex flex-col overflow-y-auto bg-slate-950 p-3 space-y-3">
          {/* SQL Editor */}
          {currentQ && (
            <SqlMonacoEditor
              value={currentCode}
              onChange={handleCodeChange}
              schemaTables={currentQ.schemaOverview || []}
              starterCode={currentQ.starterCode}
              height="340px"
            />
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800 shrink-0">
            <div className="text-[11px] text-slate-400 font-mono">
              Press <strong className="text-white">Run Query</strong> to preview, or <strong className="text-white">Submit</strong> to score.
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunQuery}
                disabled={isRunning || isSubmitting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 font-semibold text-xs transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-sky-400" />
                <span>{isRunning ? "Running..." : "Run Query (Sample)"}</span>
              </button>

              <button
                onClick={handleFinalSubmitQuestion}
                disabled={isRunning || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950 transition active:scale-[0.98] disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Evaluating..." : "Submit Query"}</span>
              </button>
            </div>
          </div>

          {/* Execution & Comparison Results Console */}
          <div className="flex-1 min-h-[300px]">
            <SqlResultViewer result={gradingResult} isRunning={isRunning || isSubmitting} />
          </div>
        </div>

        {/* Slide-out Question Palette Drawer */}
        {paletteOpen && (
          <div className="absolute top-0 right-0 w-80 h-full bg-slate-900/95 backdrop-blur-md border-l border-slate-800 z-30 p-4 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-xs">Jump to Question</span>
              <button
                onClick={() => setPaletteOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuestionPalette
                questions={session.questions}
                currentIndex={currentIndex}
                onSelectQuestion={goToQuestion}
                flaggedQuestions={flaggedQuestions}
                drafts={drafts}
              />
            </div>
          </div>
        )}
      </div>

      {/* Finish Confirmation Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              Finish SQL Assessment?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              You are about to conclude your test session. All submitted and draft SQL queries will be evaluated and finalized. You will not be able to re-enter after submitting.
            </p>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono mb-4 space-y-1">
              <div>Total Questions: {session.questions.length}</div>
              <div>
                Answered/Submitted:{" "}
                <span className="text-emerald-400 font-bold">
                  {session.questions.filter((q) => Boolean(q.submission)).length}
                </span>
              </div>
              <div>
                Flagged for Review:{" "}
                <span className="text-purple-400 font-bold">
                  {flaggedQuestions.length}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowFinishModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Continue Assessment
              </button>
              <button
                onClick={handleFinishAssessment}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition"
              >
                Confirm & Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
