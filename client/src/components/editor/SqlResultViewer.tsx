import React, { useState } from "react";
import { QuestionGradingResult, TestCaseEvaluation } from "../../types";
import { TableDiffViewer } from "../common/TableDiffViewer";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Terminal,
  Filter,
} from "lucide-react";

interface SqlResultViewerProps {
  result: QuestionGradingResult | null;
  isRunning?: boolean;
}

export const SqlResultViewer: React.FC<SqlResultViewerProps> = ({
  result,
  isRunning = false,
}) => {
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [filterMode, setFilterMode] = useState<"ALL" | "FAILED" | "PASSED">("ALL");

  if (isRunning) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400 mb-3" />
        <span className="text-xs font-mono">Running SQL sandbox & evaluating test cases...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-8 text-center bg-slate-950 border border-slate-800/80 rounded-lg text-slate-500 font-mono text-xs">
        <Terminal className="w-6 h-6 mx-auto mb-2 text-slate-600" />
        Click <strong className="text-sky-400 font-semibold">"Run Query"</strong> to test against sample data, or <strong className="text-emerald-400 font-semibold">"Submit Query"</strong> to evaluate against all test cases.
      </div>
    );
  }

  const { testCaseResults } = result;
  const filteredCases = testCaseResults.filter((tc) => {
    if (filterMode === "FAILED") return tc.status !== "PASSED";
    if (filterMode === "PASSED") return tc.status === "PASSED";
    return true;
  });

  const activeCase: TestCaseEvaluation | undefined =
    filteredCases[selectedCaseIdx] || filteredCases[0] || testCaseResults[0];

  const isAccepted = result.status === "ACCEPTED";
  const isSyntaxError = result.status === "SQL_SYNTAX_ERROR";

  return (
    <div className="flex flex-col border border-slate-800 rounded-lg overflow-hidden bg-slate-950 text-xs">
      {/* Overall Status Bar */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-slate-900 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isAccepted
                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                : isSyntaxError
                ? "bg-rose-950 text-rose-400 border border-rose-800"
                : "bg-amber-950 text-amber-400 border border-amber-800"
            }`}
          >
            {isAccepted ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : isSyntaxError ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>{result.status}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-300 font-mono text-xs">
            <span>Score:</span>
            <span className="font-bold text-white">
              {result.score} / {result.maxScore}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
            <span>Passed:</span>
            <span className="text-sky-400 font-bold">
              {result.passedTestCases} / {result.totalTestCases}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{result.executionTimeMs} ms</span>
          </div>

          {/* Test Case Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded text-[11px]">
            <Filter className="w-3 h-3 text-slate-500 ml-1.5" />
            <button
              onClick={() => {
                setFilterMode("ALL");
                setSelectedCaseIdx(0);
              }}
              className={`px-2 py-0.5 rounded transition ${
                filterMode === "ALL" ? "bg-slate-700 text-white font-medium" : "text-slate-400"
              }`}
            >
              All ({testCaseResults.length})
            </button>
            <button
              onClick={() => {
                setFilterMode("PASSED");
                setSelectedCaseIdx(0);
              }}
              className={`px-2 py-0.5 rounded transition ${
                filterMode === "PASSED" ? "bg-slate-700 text-emerald-400 font-medium" : "text-slate-400"
              }`}
            >
              Passed ({result.passedTestCases})
            </button>
            <button
              onClick={() => {
                setFilterMode("FAILED");
                setSelectedCaseIdx(0);
              }}
              className={`px-2 py-0.5 rounded transition ${
                filterMode === "FAILED" ? "bg-slate-700 text-rose-400 font-medium" : "text-slate-400"
              }`}
            >
              Failed ({result.totalTestCases - result.passedTestCases})
            </button>
          </div>
        </div>
      </div>

      {/* Test Case Tabs */}
      <div className="flex items-center gap-1.5 p-2 bg-slate-900/60 border-b border-slate-800 overflow-x-auto">
        {filteredCases.map((tc, idx) => {
          const isSelected = activeCase && activeCase.testCaseId === tc.testCaseId;
          const passed = tc.status === "PASSED";

          return (
            <button
              key={tc.testCaseId}
              onClick={() => setSelectedCaseIdx(idx)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition shrink-0 ${
                isSelected
                  ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              {passed ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{tc.title}</span>
              {!tc.isPublic && (
                <span className="text-[10px] text-slate-500 bg-slate-800 px-1 py-0.2 rounded">
                  Hidden
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Test Case Execution Breakdown */}
      <div className="p-3">
        {activeCase ? (
          <div>
            {activeCase.status === "ERROR" ? (
              <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-900/80 text-rose-200 font-mono text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>SQL Execution Error</span>
                </div>
                <div className="whitespace-pre-wrap mt-2">{activeCase.errorMessage}</div>
              </div>
            ) : (
              <TableDiffViewer
                actualColumns={activeCase.actualColumns}
                actualRows={activeCase.actualRows}
                expectedColumns={activeCase.expectedColumns}
                expectedRows={activeCase.expectedRows}
                diff={activeCase.diff}
              />
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-slate-500 italic">
            No test cases match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
