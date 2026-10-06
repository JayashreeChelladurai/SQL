import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { getSocket, joinAdminMonitorRoom } from "../services/socket";
import {
  ArrowLeft,
  Activity,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
} from "lucide-react";

interface AdminLiveMonitorProps {
  assessmentId: string;
  onBack: () => void;
}

export const AdminLiveMonitor: React.FC<AdminLiveMonitorProps> = ({
  assessmentId,
  onBack,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
    joinAdminMonitorRoom(assessmentId);

    const socket = getSocket();
    socket.on("student:progress", (progress: any) => {
      // Refresh or update state on live progress
      setData((prev: any) => {
        if (!prev) return prev;
        const updatedStudents = prev.students.map((s: any) => {
          if (s.attemptId === progress.attemptId) {
            return {
              ...s,
              status: progress.status || s.status,
              totalScore: progress.score !== undefined ? progress.score : s.totalScore,
              submittedAt: progress.submittedAt || s.submittedAt,
            };
          }
          return s;
        });
        return { ...prev, students: updatedStudents };
      });
    });

    return () => {
      socket.off("student:progress");
    };
  }, [assessmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getGradebook(assessmentId);
      setData(res);
    } catch (err: any) {
      alert("Failed to load live monitor: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs">
        Connecting to live monitor...
      </div>
    );
  }

  const filtered = data.students.filter(
    (s: any) =>
      s.rollNo.toLowerCase().includes(search.toLowerCase()) ||
      s.studentName.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = data.students.filter((s: any) => s.status === "IN_PROGRESS").length;
  const submittedCount = data.students.filter((s: any) => s.status === "SUBMITTED").length;

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
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h1 className="font-bold text-white text-sm">
              Live Proctoring: {data.title} ({data.code})
            </h1>
          </div>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-mono text-[11px]">Total Candidates</div>
              <div className="text-2xl font-bold text-white mt-1">{data.students.length}</div>
            </div>
            <Users className="w-8 h-8 text-sky-500/40" />
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-mono text-[11px]">Currently Active</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{activeCount}</div>
            </div>
            <Clock className="w-8 h-8 text-amber-500/40" />
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-mono text-[11px]">Submitted Finished</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{submittedCount}</div>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
          </div>
        </div>

        {/* Search */}
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

        {/* Candidates Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-sm">
          <table className="min-w-full text-left font-mono text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Roll No</th>
                <th className="px-4 py-3 font-semibold">Candidate Name</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Submissions</th>
                <th className="px-4 py-3 font-semibold">Client IP</th>
                <th className="px-4 py-3 font-semibold">Started At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((s: any) => (
                <tr key={s.attemptId} className="hover:bg-slate-800/30 transition">
                  <td className="px-4 py-3 font-mono font-bold text-sky-400">
                    {s.rollNo}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {s.studentName}
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
                  <td className="px-4 py-3 font-mono font-bold text-white">
                    {s.totalScore} / {s.totalMaxScore} ({s.percentage}%)
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {s.submissionCount} questions
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                    {s.ipAddress || "127.0.0.1"}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                    {new Date(s.startedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
