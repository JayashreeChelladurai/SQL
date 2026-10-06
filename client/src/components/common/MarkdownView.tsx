import React from "react";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = "" }) => {
  if (!content) return null;

  // Simple, robust Markdown parser that handles headings, code blocks, tables, and lists
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushCodeBlock = (key: string) => {
    if (codeBlockContent.length > 0) {
      elements.push(
        <pre
          key={key}
          className="bg-slate-900/90 text-sky-300 p-3 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto my-3"
        >
          <code>{codeBlockContent.join("\n")}</code>
        </pre>
      );
      codeBlockContent = [];
    }
  };

  const flushTable = (key: string) => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1).filter((r) => !r.every((c) => c.match(/^[-:]+$/)));
      elements.push(
        <div key={key} className="overflow-x-auto my-3 rounded-lg border border-slate-800">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="px-3 py-2">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                  {row.map((cell, cIdx) => {
                    const val = cell.trim();
                    const isNull = val.toUpperCase() === "NULL";
                    return (
                      <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap">
                        {isNull ? (
                          <span className="text-amber-400 font-semibold italic text-[11px] bg-amber-950/40 px-1 py-0.5 rounded">
                            NULL
                          </span>
                        ) : (
                          val
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock(`code-${i}`);
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      inTable = true;
      const cells = line
        .trim()
        .slice(1, -1)
        .split("|");
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable(`table-${i}`);
      inTable = false;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-sky-400 uppercase tracking-wider mt-4 mb-2">
          {line.substring(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-base font-bold text-white mt-4 mb-2">
          {line.substring(3)}
        </h2>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={`li-${i}`} className="ml-4 list-disc text-slate-300 text-xs my-1">
          {line.substring(2)}
        </li>
      );
    } else if (line.trim().length > 0) {
      elements.push(
        <p key={`p-${i}`} className="text-slate-300 text-xs leading-relaxed my-2">
          {line}
        </p>
      );
    }
  }

  if (inCodeBlock) flushCodeBlock("code-end");
  if (inTable) flushTable("table-end");

  return <div className={`markdown-view space-y-1 ${className}`}>{elements}</div>;
};
