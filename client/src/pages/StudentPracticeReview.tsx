import React from "react";
import { CheckCircle, Database, ArrowLeft, ExternalLink } from "lucide-react";

interface StudentPracticeReviewProps {
  onReturnToLogin: () => void;
}

export const StudentPracticeReview: React.FC<StudentPracticeReviewProps> = ({
  onReturnToLogin,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-xs">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Assessment Completed!
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            Your SQL queries and test case solutions have been safely recorded, sandboxed, and submitted to the evaluation engine.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-left font-mono text-[11px] space-y-1.5 text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-500">Evaluation Engine:</span>
            <span className="text-sky-400 font-semibold">SQLite In-Memory Sandbox</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Submission Status:</span>
            <span className="text-emerald-400 font-semibold">VERIFIED & SAVED</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Integrity Check:</span>
            <span className="text-slate-300">Passed (0 Violations)</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onReturnToLogin}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Candidate Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
