import React, { useState } from "react";
import { TableSchemaInfo } from "../../types";
import { Database, Key, Columns } from "lucide-react";

interface SchemaViewerProps {
  tables: TableSchemaInfo[];
}

export const SchemaViewer: React.FC<SchemaViewerProps> = ({ tables }) => {
  const [selectedTableIdx, setSelectedTableIdx] = useState(0);

  if (!tables || tables.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 italic text-xs">
        No schema table definitions available.
      </div>
    );
  }

  const currentTable = tables[selectedTableIdx] || tables[0];
  const columns = currentTable.columns.map((c) => c.name);
  const rows = currentTable.sampleRows.map((r) => columns.map((col) => r[col] ?? null));

  return (
    <div className="flex flex-col bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden text-xs">
      {/* Table Selector Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border-b border-slate-800 overflow-x-auto">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 px-2 select-none">
          <Database className="w-3.5 h-3.5 text-sky-400" />
          <span>Tables:</span>
        </span>
        {tables.map((t, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedTableIdx(idx)}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
              idx === selectedTableIdx
                ? "bg-sky-600/30 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            {t.tableName}
          </button>
        ))}
      </div>

      {/* Table Columns Definition */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/30">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-2">
          <Columns className="w-3 h-3 text-sky-400" />
          <span>Table Structure & Columns</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {currentTable.columns.map((col, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800/80 font-mono text-[11px]"
            >
              <div className="flex items-center gap-1.5 truncate">
                {col.isPk && (
                  <span title="Primary Key">
                    <Key className="w-3 h-3 text-amber-400 shrink-0" />
                  </span>
                )}
                <span className="font-semibold text-slate-200 truncate">{col.name}</span>
              </div>
              <span className="text-sky-400/80 text-[10px] uppercase font-mono px-1 py-0.2 bg-slate-800 rounded shrink-0">
                {col.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sample Input Data */}
      <div className="p-3">
        <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-2">
          Sample Input Data ({currentTable.sampleRows.length} rows)
        </div>
        {rows.length === 0 ? (
          <div className="text-slate-500 italic text-center py-2">
            No sample records present.
          </div>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-800">
            <table className="min-w-full font-mono text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
                <tr>
                  {columns.map((c, i) => (
                    <th key={i} className="px-2.5 py-1.5 font-semibold text-slate-300">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-800/20">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-2.5 py-1 text-slate-300 whitespace-nowrap">
                        {cell === null ? (
                          <span className="text-amber-400 italic text-[11px]">NULL</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
