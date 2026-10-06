import React, { useState } from "react";
import { api } from "../services/api";
import { SebGatekeeper } from "../components/seb/SebGatekeeper";
import { Database, ShieldCheck, ArrowRight, AlertCircle, Lock } from "lucide-react";

interface StudentLoginProps {
  onLoginSuccess: (attemptId: string) => void;
  onGoToAdmin: () => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({
  onLoginSuccess,
  onGoToAdmin,
}) => {
  const [code, setCode] = useState("SQL1");
  const [rollNo, setRollNo] = useState("");
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sebLockedAssessment, setSebLockedAssessment] = useState<any>(null);

  const performLogin = async (bypassSeb = false) => {
    if (!code || !rollNo || !studentName) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };

    try {
      const res = await api.studentLogin({
        code: code.trim().toUpperCase(),
        rollNo: rollNo.trim().toUpperCase(),
        studentName: studentName.trim(),
        deviceInfo,
        bypassSeb,
      });

      onLoginSuccess(res.attemptId);
    } catch (err: any) {
      if (err.requireSeb && err.assessment) {
        setSebLockedAssessment(err.assessment);
      } else {
        setError(err.message || "Failed to enter assessment.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(false);
  };

  // If assessment requires SEB and user is on regular browser, display SebGatekeeper
  if (sebLockedAssessment) {
    return (
      <SebGatekeeper
        assessment={sebLockedAssessment}
        onBack={() => setSebLockedAssessment(null)}
        onBypassForTesting={() => performLogin(true)}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Brand / Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 mb-3">
            <Database className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            SQL Assessment Platform
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standard Query Language & Database Engineering Examination
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            <Lock className="w-3 h-3" />
            <span>Safe Exam Browser (SEB) Mandatory</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-rose-950/60 border border-rose-900 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Assessment Access Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. SQL1 or SQL101"
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-sm uppercase placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Candidate Roll Number
            </label>
            <input
              type="text"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              placeholder="e.g. 23CS042"
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-sm uppercase placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Legal Name
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-sky-500/25 transition active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Begin SQL Assessment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Anti-Cheat & SEB Protected</span>
          </div>

          <button
            onClick={onGoToAdmin}
            className="text-sky-400 hover:text-sky-300 transition"
          >
            Instructor Portal &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
