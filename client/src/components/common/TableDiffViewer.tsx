import React, { useState } from "react";
import { TableGrid } from "./TableGrid";
import { CheckCircle2, XCircle, SplitSquareHorizontal, Table, AlertTriangle } from "lucide-react";

interface TableDiffViewerProps {
  actualColumns: string[];
  actualRows: any[][];
  expectedColumns: string[];
  expectedRows: any[][];
  diff: {
    status: "PASSED" | "FAILED";
    reason?: string;
    columnMismatch?: { expected: string[]; actual: string[] };
    rowCountMismatch?: { expected: number; actual: number };
    cellMismatches?: {
      rowIdx: number;
      colIdx: number;
      columnName: string;
      expected: any;
      actual: any;
    }[];
  };
}

export const TableDiffViewer: React.FC<TableDiffViewerProps> = ({
  actualColumns,
  actualRows,
  expectedColumns,
  expectedRows,
  diff,
}) => {
  const [viewMode, setViewMode] = useState<"side-by-side" | "actual" | "expected">(
    "side-by-side"
  );

  const isPassed = diff.status === "PASSED";

  return (
    <div className="flex flex-col space-y-3">
      {/* Status Banner */}
      <div
        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
          isPassed
            ? "bg-emerald-950/40 border-emerald-800 text-emerald-200"
            : "bg-rose-950/40 border-rose-800 text-rose-200"
        }`}
      >
        <div className="flex items-center gap-2">
          {isPassed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="font-semibold">
            {isPassed ? "Output Matches Expected Solution!" : "Output Mismatch"}
          </span>
          {diff.reason && (
            <span className="text-slate-300 ml-2 font-mono text-[11px]">
              — {diff.reason}
            </span>
          )}
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setViewMode("side-by-side")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
              viewMode === "side-by-side"
                ? "bg-sky-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <SplitSquareHorizontal className="w-3 h-3" />
            <span>Side-by-Side</span>
          </button>
          <button
            onClick={() => setViewMode("actual")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
              viewMode === "actual"
                ? "bg-sky-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Table className="w-3 h-3" />
            <span>Actual ({actualRows.length})</span>
          </button>
          <button
            onClick={() => setViewMode("expected")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
              viewMode === "expected"
                ? "bg-sky-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Table className="w-3 h-3" />
            <span>Expected ({expectedRows.length})</span>
          </button>
        </div>
      </div>

      {/* Grid Display */}
      {viewMode === "side-by-side" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] font-semibold text-sky-400 mb-1 flex items-center gap-1">
              <span>Your Query Result</span>
              {!isPassed && <span className="text-rose-400">(Actual)</span>}
            </div>
            <TableGrid
              columns={actualColumns}
              rows={actualRows}
              title="Your Output"
              highlightMismatches={diff.cellMismatches || []}
            />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
              <span>Expected Solution Result</span>
              <span>(Canonical)</span>
            </div>
            <TableGrid
              columns={expectedColumns}
              rows={expectedRows}
              title="Expected Output"
            />
          </div>
        </div>
      )}

      {viewMode === "actual" && (
        <TableGrid
          columns={actualColumns}
          rows={actualRows}
          title="Your Query Output"
          highlightMismatches={diff.cellMismatches || []}
        />
      )}

      {viewMode === "expected" && (
        <TableGrid
          columns={expectedColumns}
          rows={expectedRows}
          title="Expected Solution Output"
        />
      )}

      {/* Detailed Mismatch Details */}
      {diff.cellMismatches && diff.cellMismatches.length > 0 && (
        <div className="bg-slate-900/80 border border-rose-900/60 p-3 rounded-lg text-xs">
          <div className="flex items-center gap-1.5 text-rose-400 font-semibold mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Mismatched Cell Values Detected:</span>
          </div>
          <div className="space-y-1 font-mono text-[11px] max-h-32 overflow-y-auto">
            {diff.cellMismatches.slice(0, 5).map((m, idx) => (
              <div key={idx} className="text-slate-300">
                Row #{m.rowIdx + 1}, Column <span className="text-sky-300 font-bold">{m.columnName}</span>: Expected{" "}
                <span className="text-emerald-400 font-bold">
                  {m.expected === null ? "NULL" : String(m.expected)}
                </span>
                , but received{" "}
                <span className="text-rose-400 font-bold">
                  {m.actual === null ? "NULL" : String(m.actual)}
                </span>
              </div>
            ))}
            {diff.cellMismatches.length > 5 && (
              <div className="text-slate-500 italic">
                ...and {diff.cellMismatches.length - 5} more mismatched cells
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
