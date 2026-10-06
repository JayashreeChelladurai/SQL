import React, { useState } from "react";
import { Copy, Check, Table as TableIcon } from "lucide-react";

interface TableGridProps {
  columns: string[];
  rows: any[][];
  title?: string;
  maxHeight?: string;
  emptyMessage?: string;
  highlightMismatches?: { rowIdx: number; colIdx: number }[];
}

export const TableGrid: React.FC<TableGridProps> = ({
  columns,
  rows,
  title,
  maxHeight = "max-h-64",
  emptyMessage = "Query executed successfully, returning 0 rows.",
  highlightMismatches = [],
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (columns.length === 0) return;
    const header = columns.join("\t");
    const body = rows.map((r) => r.map((c) => (c === null ? "NULL" : c)).join("\t")).join("\n");
    navigator.clipboard.writeText(`${header}\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCellMismatch = (rIdx: number, cIdx: number) => {
    return highlightMismatches.some((m) => m.rowIdx === rIdx && m.colIdx === cIdx);
  };

  return (
    <div className="flex flex-col border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60 shadow-sm text-xs">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <TableIcon className="w-3.5 h-3.5 text-sky-400" />
          <span>{title || "Results Grid"}</span>
          <span className="text-[11px] font-mono text-slate-400 px-1.5 py-0.2 bg-slate-800 rounded">
            {rows.length} row{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        {rows.length > 0 && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
            title="Copy as TSV"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Table Body */}
      {columns.length === 0 || rows.length === 0 ? (
        <div className="p-6 text-center text-slate-400 italic font-mono text-xs">
          {emptyMessage}
        </div>
      ) : (
        <div className={`overflow-auto ${maxHeight}`}>
          <table className="min-w-full text-left font-mono border-collapse">
            <thead className="bg-slate-900/90 sticky top-0 z-10 text-slate-300 border-b border-slate-800 shadow-sm">
              <tr>
                <th className="px-2 py-1.5 w-10 text-center text-slate-500 font-normal border-r border-slate-800 select-none">
                  #
                </th>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-3 py-1.5 font-semibold text-slate-200 border-r border-slate-800 last:border-r-0 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-slate-800/30 transition-colors odd:bg-slate-950/20 even:bg-slate-900/20"
                >
                  <td className="px-2 py-1.5 text-center text-slate-600 text-[11px] border-r border-slate-800 select-none">
                    {rIdx + 1}
                  </td>
                  {row.map((cell, cIdx) => {
                    const mismatched = isCellMismatch(rIdx, cIdx);
                    const isNull = cell === null || cell === undefined;
                    const isNumber = typeof cell === "number";

                    return (
                      <td
                        key={cIdx}
                        className={`px-3 py-1.5 border-r border-slate-800/60 last:border-r-0 whitespace-nowrap ${
                          mismatched
                            ? "bg-rose-950/50 text-rose-300 font-semibold ring-1 ring-inset ring-rose-500"
                            : ""
                        } ${isNumber ? "text-right" : "text-left"}`}
                      >
                        {isNull ? (
                          <span className="text-amber-400/90 italic font-medium bg-amber-950/30 px-1 py-0.5 rounded text-[11px]">
                            NULL
                          </span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
