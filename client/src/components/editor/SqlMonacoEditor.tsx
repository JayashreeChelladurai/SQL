import React, { useRef, useState, useEffect } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import { TableSchemaInfo } from "../../types";
import { Sparkles, RotateCcw, Code } from "lucide-react";

interface SqlMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  schemaTables?: TableSchemaInfo[];
  starterCode?: string;
  readOnly?: boolean;
  height?: string;
}

export const SqlMonacoEditor: React.FC<SqlMonacoEditorProps> = ({
  value,
  onChange,
  schemaTables = [],
  starterCode = "",
  readOnly = false,
  height = "380px",
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Fallback timer if Monaco CDN takes longer than 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isEditorReady) {
        setFallbackMode(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isEditorReady]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsEditorReady(true);
    setFallbackMode(false);

    // Register Schema Table and Column Autocompletion
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: any[] = [];

        // Schema Tables
        for (const t of schemaTables) {
          suggestions.push({
            label: t.tableName,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: t.tableName,
            detail: `Table: ${t.tableName}`,
            range,
          });

          // Schema Columns
          for (const c of t.columns) {
            suggestions.push({
              label: c.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: c.name,
              detail: `Column in ${t.tableName} (${c.type})`,
              range,
            });
          }
        }

        // Standard SQL Functions & Keywords
        const sqlKeywords = [
          "SELECT",
          "FROM",
          "WHERE",
          "GROUP BY",
          "HAVING",
          "ORDER BY",
          "LIMIT",
          "OFFSET",
          "JOIN",
          "LEFT JOIN",
          "INNER JOIN",
          "RIGHT JOIN",
          "CROSS JOIN",
          "ON",
          "WITH",
          "AS",
          "DENSE_RANK() OVER (PARTITION BY  ORDER BY )",
          "ROW_NUMBER() OVER (PARTITION BY  ORDER BY )",
          "RANK() OVER (PARTITION BY  ORDER BY )",
          "LAG(",
          "LEAD(",
          "COALESCE(",
          "ROUND(",
          "CASE WHEN  THEN  ELSE  END",
          "DISTINCT",
          "COUNT(",
          "SUM(",
          "AVG(",
          "MIN(",
          "MAX(",
          "UNION ALL",
          "IS NULL",
          "IS NOT NULL",
        ];

        for (const kw of sqlKeywords) {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            detail: "SQL Keyword",
            range,
          });
        }

        return { suggestions };
      },
    });
  };

  // Lightweight SQL Prettifier: Uppercases SQL keywords and cleans spacing
  const formatSql = () => {
    if (!value) return;
    const keywords = [
      "select",
      "from",
      "where",
      "group by",
      "having",
      "order by",
      "limit",
      "offset",
      "join",
      "left join",
      "inner join",
      "on",
      "with",
      "as",
      "distinct",
      "and",
      "or",
      "case",
      "when",
      "then",
      "else",
      "end",
      "dense_rank()",
      "row_number()",
      "over",
      "partition by",
      "coalesce",
      "round",
      "count",
      "sum",
      "avg",
      "is null",
      "is not null",
      "union all",
    ];

    let formatted = value;
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, "gi");
      formatted = formatted.replace(regex, kw.toUpperCase());
    }

    onChange(formatted);
  };

  const resetToStarter = () => {
    if (starterCode && window.confirm("Reset SQL editor to starter code?")) {
      onChange(starterCode);
    }
  };

  return (
    <div className="flex flex-col border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Code className="w-3.5 h-3.5 text-sky-400" />
          <span>SQL Query Editor</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={formatSql}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Uppercase SQL keywords and tidy query"
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span>Format SQL</span>
          </button>

          {starterCode && !readOnly && (
            <button
              onClick={resetToStarter}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
              title="Reset query to original template"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor or Instant Fallback */}
      <div style={{ height }}>
        {fallbackMode && !isEditorReady ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            placeholder="-- Write your SQL query here..."
            className="w-full h-full p-4 bg-slate-950 text-sky-100 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
          />
        ) : (
          <Editor
            height="100%"
            language="sql"
            theme="vs-dark"
            value={value}
            onChange={(val) => onChange(val || "")}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'Fira Code', Consolas, monospace",
              fontLigatures: true,
              lineNumbers: "on",
              readOnly,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              suggestOnTriggerCharacters: true,
              padding: { top: 12, bottom: 12 },
            }}
          />
        )}
      </div>
    </div>
  );
};
