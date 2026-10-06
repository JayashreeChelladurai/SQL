import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { SqlInspectorModal } from "../components/admin/SqlInspectorModal";
import {
  ArrowLeft,
  Award,
  Download,
  Code,
  Search,
  Filter,
  CheckCircle,
} from "lucide-react";

interface AdminGradebookProps {
  assessmentId: string;
  onBack: () => void;
}

export const AdminGradebook: React.FC<AdminGradebookProps> = ({
  assessmentId,
  onBack,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [inspectorData, setInspectorData] = useState<any>(null);
  const [loadingInspector, setLoadingInspector] = useState(false);

  useEffect(() => {
    loadGradebook();
  }, [assessmentId]);

  const loadGradebook = async () => {
    try {
      setLoading(true);
      const res = await api.getGradebook(assessmentId);
      setData(res);
    } catch (err: any) {
      alert("Failed to load gradebook: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInspector = async (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setLoadingInspector(true);
    try {
      const details = await api.getAttemptInspector(attemptId);
      setInspectorData(details);
    } catch (err: any) {
      alert("Failed to load candidate queries: " + err.message);
      setSelectedAttemptId(null);
    } finally {
      setLoadingInspector(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs">
        Loading gradebook and results...
      </div>
    );
  }

  const filtered = data.students.filter(
    (s: any) =>
      s.rollNo.toLowerCase().includes(search.toLowerCase()) ||
      s.studentName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans text-xs">
      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h1 className="font-bold text-white text-sm">
              Gradebook: {data.title} ({data.code})
            </h1>
          </div>
        </div>

        <a
          href={api.getExportCsvUrl(assessmentId)}
          download
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate by roll number or name..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </div>

        {/* Gradebook Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-sm">
          <table className="min-w-full text-left font-mono text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Rank</th>
                <th className="px-4 py-3 font-semibold">Roll No</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Percentage</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Submitted At</th>
                <th className="px-4 py-3 text-right font-semibold">Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((s: any, idx: number) => (
                <tr key={s.attemptId} className="hover:bg-slate-800/30 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-500">
                    #{idx + 1}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-sky-400">
                    {s.rollNo}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {s.studentName}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                    {s.totalScore} / {s.totalMaxScore}
                  </td>
                  <td className="px-4 py-3 font-mono text-white">
                    {s.percentage}%
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                        s.status === "SUBMITTED"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                    {s.submittedAt
                      ? new Date(s.submittedAt).toLocaleTimeString()
                      : "In progress"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenInspector(s.attemptId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition font-mono font-semibold"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Inspect SQL</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* SQL Inspector Modal */}
      {selectedAttemptId && inspectorData && (
        <SqlInspectorModal
          data={inspectorData}
          onClose={() => {
            setSelectedAttemptId(null);
            setInspectorData(null);
          }}
        />
      )}
    </div>
  );
};
