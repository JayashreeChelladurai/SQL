import React, { useState } from "react";
import { TableDiffViewer } from "../common/TableDiffViewer";
import {
  X,
  User,
  Monitor,
  Globe,
  Code,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Check,
} from "lucide-react";

interface SqlInspectorModalProps {
  data: any;
  onClose: () => void;
}

export const SqlInspectorModal: React.FC<SqlInspectorModalProps> = ({
  data,
  onClose,
}) => {
  const [selectedQIdx, setSelectedQIdx] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!data) return null;

  const currentQ = data.questions[selectedQIdx] || data.questions[0];
  const submission = currentQ?.submission;

  const handleCopyCode = () => {
    if (!submission?.code) return;
    navigator.clipboard.writeText(submission.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {data.studentName}
                </h2>
                <span className="font-mono text-sky-400 font-semibold px-2 py-0.5 bg-sky-950/60 rounded">
                  {data.rollNo}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    data.status === "SUBMITTED"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : "bg-amber-950 text-amber-400 border border-amber-800"
                  }`}
                >
                  {data.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-400 text-[11px] mt-1 font-mono">
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-500" />
                  IP: {data.ipAddress || "Unknown"}
                </span>
                <span className="flex items-center gap-1">
                  <Monitor className="w-3 h-3 text-slate-500" />
                  Device: {data.deviceInfo || "Standard Browser"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question Selector Tabs */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-950/50 border-b border-slate-800 overflow-x-auto">
          {data.questions.map((q: any, idx: number) => {
            const isSelected = idx === selectedQIdx;
            const sub = q.submission;
            const isFullScore = sub && sub.score === sub.maxScore;

            return (
              <button
                key={q.id}
                onClick={() => setSelectedQIdx(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
                  isSelected
                    ? "bg-sky-600/30 text-sky-200 border border-sky-500/50 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <span>Q{idx + 1}: {q.title}</span>
                {sub ? (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isFullScore
                        ? "bg-emerald-950 text-emerald-400"
                        : "bg-amber-950 text-amber-400"
                    }`}
                  >
                    {sub.score}/{sub.maxScore}m
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.2 rounded">
                    No Sub
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Question Summary Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <div className="font-bold text-white text-sm">
                {currentQ.title}
              </div>
              <div className="text-slate-400 text-xs mt-0.5">
                Difficulty:{" "}
                <span className="text-sky-400 font-semibold uppercase">
                  {currentQ.difficulty}
                </span>{" "}
                | Marks: <span className="text-white font-semibold">{currentQ.marks}</span>
              </div>
            </div>

            {submission && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-emerald-400 font-bold text-base">
                    {submission.score} / {submission.maxScore} Marks
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono">
                    Passed: {submission.passedTestCases} / {submission.totalTestCases} Test Cases
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submitted Code Viewer */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-sky-400" />
                <span>Submitted Candidate SQL Query</span>
              </div>
              {submission?.code && (
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Query</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono text-xs overflow-x-auto text-sky-200">
              {submission ? (
                <pre>{submission.code}</pre>
              ) : currentQ.draftCode ? (
                <div>
                  <div className="text-amber-400/80 text-[11px] mb-1 italic">
                    (Candidate did not finalize submission. Displaying auto-saved draft code):
                  </div>
                  <pre>{currentQ.draftCode}</pre>
                </div>
              ) : (
                <div className="text-slate-600 italic">No SQL code submitted for this problem.</div>
              )}
            </div>
          </div>

          {/* Query Submission History & Audit Trail */}
          {currentQ.queryHistory && currentQ.queryHistory.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Recorded Query Submissions & Scores ({currentQ.queryHistory.length})</span>
                <span className="text-[11px] text-slate-500 font-mono">Audit Log</span>
              </div>
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 font-mono text-[11px]">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Action</th>
                      <th className="px-3 py-2 font-semibold">Score</th>
                      <th className="px-3 py-2 font-semibold">Test Cases</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Submitted Query</th>
                      <th className="px-3 py-2 font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {currentQ.queryHistory.map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="px-3 py-1.5 font-bold text-sky-400">{log.actionType}</td>
                        <td className="px-3 py-1.5 font-bold text-emerald-400">{log.score}/{log.maxScore}m</td>
                        <td className="px-3 py-1.5 text-slate-400">{log.passedTestCases}/{log.totalTestCases}</td>
                        <td className="px-3 py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.status === "ACCEPTED" ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-slate-300 truncate max-w-xs">{log.query}</td>
                        <td className="px-3 py-1.5 text-slate-500 text-[10px]">{new Date(log.createdAt).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Test Cases Results Breakdown */}
          {submission && submission.testCaseResults && (
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Evaluated Test Cases ({submission.testCaseResults.length})
              </div>
              <div className="space-y-3">
                {submission.testCaseResults.map((tc: any, i: number) => {
                  const passed = tc.status === "PASSED";
                  return (
                    <div
                      key={i}
                      className="border border-slate-800 rounded-lg p-3 bg-slate-950/60"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {passed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                          <span className="font-semibold text-white font-mono">
                            {tc.title}
                          </span>
                          {!tc.isPublic && (
                            <span className="text-[10px] text-slate-500 bg-slate-800 px-1 py-0.2 rounded font-mono">
                              Hidden Benchmark
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-[11px] font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{tc.executionTimeMs} ms</span>
                        </div>
                      </div>

                      {tc.status === "ERROR" ? (
                        <div className="p-3 bg-rose-950/40 border border-rose-900 rounded text-rose-300 font-mono text-[11px]">
                          {tc.errorMessage}
                        </div>
                      ) : (
                        <TableDiffViewer
                          actualColumns={tc.actualColumns}
                          actualRows={tc.actualRows}
                          expectedColumns={tc.expectedColumns}
                          expectedRows={tc.expectedRows}
                          diff={tc.diff}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
