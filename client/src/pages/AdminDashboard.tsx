import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { AdminAssessmentSummary } from "../types";
import {
  Database,
  Plus,
  Edit3,
  Activity,
  Award,
  Trash2,
  Clock,
  HelpCircle,
  Users,
  LogOut,
  ExternalLink,
} from "lucide-react";

interface AdminDashboardProps {
  onSelectAssessment: (id: string, view: "editor" | "monitor" | "gradebook") => void;
  onLogout: () => void;
  onGoToStudent: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectAssessment,
  onLogout,
  onGoToStudent,
}) => {
  const [assessments, setAssessments] = useState<AdminAssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New assessment form state
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState(60);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const data = await api.getAssessments();
      setAssessments(data);
    } catch (err: any) {
      alert("Failed to load assessments: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCode) return;

    setCreating(true);
    try {
      const created = await api.createAssessment({
        title: newTitle,
        code: newCode,
        description: newDesc,
        durationMinutes: newDuration,
      });
      setShowCreateModal(false);
      setNewTitle("");
      setNewCode("");
      setNewDesc("");
      loadAssessments();
      onSelectAssessment(created.id, "editor");
    } catch (err: any) {
      alert(err.message || "Failed to create assessment");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete assessment "${title}"?`)) {
      try {
        await api.deleteAssessment(id);
        loadAssessments();
      } catch (err: any) {
        alert(err.message || "Failed to delete");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">
              SQL Assessment Management Console
            </h1>
            <p className="text-[11px] text-slate-400">
              Instructor Administration & Live Operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onGoToStudent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Candidate Portal</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/60 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              SQL Assessments
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Create, configure, and monitor database query exams
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New SQL Assessment</span>
          </button>
        </div>

        {/* Assessment Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            Loading assessments...
          </div>
        ) : assessments.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-slate-800 text-center bg-slate-900/30">
            <Database className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">No Assessments Yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Create your first SQL query examination suite.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-medium"
            >
              Create Assessment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-bold text-xs text-sky-400 px-2 py-0.5 bg-sky-950/80 border border-sky-800/60 rounded">
                      CODE: {a.code}
                    </span>
                    <button
                      onClick={() => handleDelete(a.id, a.title)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="Delete Assessment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5 leading-snug">
                    {a.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {a.description || "No description provided."}
                  </p>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] font-mono text-slate-400 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{a.durationMinutes}m</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>{a._count?.questions || 0} Qs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{a._count?.attempts || 0} Stus</span>
                    </div>
                  </div>
                </div>

                {/* Operations Bar */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-xs">
                  <button
                    onClick={() => onSelectAssessment(a.id, "editor")}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Author</span>
                  </button>

                  <button
                    onClick={() => onSelectAssessment(a.id, "monitor")}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Monitor</span>
                  </button>

                  <button
                    onClick={() => onSelectAssessment(a.id, "gradebook")}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Results</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-xs">
            <h3 className="text-base font-bold text-white mb-3">
              Create New SQL Assessment
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Assessment Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Midterm SQL Practical Exam"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Access Code (Uppercase)
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. SQL2026"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono uppercase placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Topics covered: Joins, Window functions, CTEs..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create & Start Authoring"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
