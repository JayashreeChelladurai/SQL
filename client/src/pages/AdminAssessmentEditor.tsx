import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { FullAdminAssessment } from "../types";
import { TableGrid } from "../components/common/TableGrid";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Database,
  Play,
  CheckCircle,
  HelpCircle,
  Code,
  Layers,
  Sparkles,
} from "lucide-react";

interface AdminAssessmentEditorProps {
  assessmentId: string;
  onBack: () => void;
}

export const AdminAssessmentEditor: React.FC<AdminAssessmentEditorProps> = ({
  assessmentId,
  onBack,
}) => {
  const [assessment, setAssessment] = useState<FullAdminAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQIdx, setSelectedQIdx] = useState(0);

  // Question Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [marks, setMarks] = useState(10);
  const [schemaDdl, setSchemaDdl] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [solutionSql, setSolutionSql] = useState("");
  const [orderSensitive, setOrderSensitive] = useState(false);
  const [testCases, setTestCases] = useState<any[]>([]);

  // Canonical preview test state
  const [testingIdx, setTestingIdx] = useState<number | null>(null);
  const [testPreviewOutput, setTestPreviewOutput] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAssessment();
  }, [assessmentId]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      const data = await api.getAssessment(assessmentId);
      setAssessment(data);
      if (data.questions.length > 0) {
        loadQuestionIntoForm(data.questions[0]);
      } else {
        resetFormForNewQuestion();
      }
    } catch (err: any) {
      alert("Failed to load: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionIntoForm = (q: any) => {
    setTitle(q.title);
    setDescription(q.description);
    setDifficulty(q.difficulty);
    setMarks(q.marks);
    setSchemaDdl(q.schemaDdl);
    setStarterCode(q.starterCode);
    setSolutionSql(q.solutionSql);
    setOrderSensitive(q.orderSensitive);
    setTestCases(
      q.testCases.map((tc: any) => ({
        id: tc.id,
        title: tc.title,
        seedData: tc.seedData,
        expectedOutput: tc.expectedOutput ? JSON.parse(tc.expectedOutput) : null,
        isPublic: tc.isPublic,
        orderSensitive: tc.orderSensitive,
        weight: tc.weight,
      }))
    );
    setTestPreviewOutput(null);
  };

  const resetFormForNewQuestion = () => {
    setTitle("");
    setDescription("");
    setDifficulty("MEDIUM");
    setMarks(10);
    setSchemaDdl("CREATE TABLE Employee (\n  id INT PRIMARY KEY,\n  name VARCHAR(50),\n  salary INT\n);");
    setStarterCode("-- Write your SQL query below\nSELECT \nFROM Employee\n");
    setSolutionSql("SELECT name, salary FROM Employee ORDER BY salary DESC;");
    setOrderSensitive(false);
    setTestCases([
      {
        title: "Sample Test Case",
        seedData: "INSERT INTO Employee VALUES (1, 'Alice', 90000), (2, 'Bob', 80000);",
        isPublic: true,
        weight: 1.0,
      },
    ]);
    setTestPreviewOutput(null);
  };

  const handleAddTestCase = () => {
    setTestCases([
      ...testCases,
      {
        title: `Test Case ${testCases.length + 1}`,
        seedData: "",
        isPublic: false,
        weight: 1.0,
      },
    ]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleTestCanonical = async (tcIdx: number) => {
    const tc = testCases[tcIdx];
    if (!schemaDdl || !solutionSql) {
      alert("Please provide both Schema DDL and Canonical Solution SQL first.");
      return;
    }

    setTestingIdx(tcIdx);
    setTestPreviewOutput(null);

    try {
      const res = await api.testCanonical(schemaDdl, tc.seedData || "", solutionSql);
      if (res.success) {
        setTestPreviewOutput({
          columns: res.columns,
          rows: res.rows,
          executionTimeMs: res.executionTimeMs,
        });
      } else {
        alert("SQL Execution Error in Canonical Query:\n" + res.error);
      }
    } catch (err: any) {
      alert("Execution failed: " + err.message);
    } finally {
      setTestingIdx(null);
    }
  };

  const handleSaveQuestion = async () => {
    if (!title || !schemaDdl || !solutionSql) {
      alert("Please fill Title, Schema DDL, and Canonical Solution SQL.");
      return;
    }

    setSaving(true);
    const activeQ = assessment?.questions[selectedQIdx];

    try {
      await api.saveQuestion(
        assessmentId,
        {
          title,
          description,
          difficulty,
          marks,
          schemaDdl,
          starterCode,
          solutionSql,
          orderSensitive,
          testCases,
        },
        activeQ?.id
      );

      await loadAssessment();
      alert("Question saved and test cases verified successfully!");
    } catch (err: any) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await api.deleteQuestion(assessmentId, qId);
        loadAssessment();
      } catch (err: any) {
        alert("Failed to delete: " + err.message);
      }
    }
  };

  if (loading || !assessment) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs">
        Loading assessment editor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans text-xs">
      {/* Top Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs">{assessment.title}</span>
            <span className="text-sky-400 font-mono px-1.5 py-0.2 bg-sky-950 rounded">
              {assessment.code}
            </span>
          </div>
        </div>

        <button
          onClick={handleSaveQuestion}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md transition disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? "Saving..." : "Save Question"}</span>
        </button>
      </header>

      {/* Main Authoring Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Questions List */}
        <div className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-slate-300">Questions ({assessment.questions.length})</span>
            <button
              onClick={() => {
                setSelectedQIdx(assessment.questions.length);
                resetFormForNewQuestion();
              }}
              className="p-1 rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600/40 transition"
              title="Add Question"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {assessment.questions.map((q, idx) => {
              const isSelected = idx === selectedQIdx;
              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setSelectedQIdx(idx);
                    loadQuestionIntoForm(q);
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                    isSelected
                      ? "bg-sky-600/20 text-sky-200 border border-sky-500/40 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="truncate">
                    <span className="font-mono mr-1">Q{idx + 1}:</span>
                    <span>{q.title}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteQuestion(q.id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Editor Pane */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section 1: Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">
                Question Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Department Top Three Salaries"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-sky-500"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Marks
              </label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Section 2: Problem Description */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <label className="block font-semibold text-slate-300 mb-1">
              Problem Description (Markdown)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="### Problem Statement:\nWrite a SQL query to..."
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Section 3: Schema DDL & Starter Code */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col">
              <label className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>Table Schema DDL (CREATE TABLE statements)</span>
              </label>
              <textarea
                value={schemaDdl}
                onChange={(e) => setSchemaDdl(e.target.value)}
                rows={6}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-sky-200 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col">
              <label className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-sky-400" />
                <span>Candidate Starter Code Template</span>
              </label>
              <textarea
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                rows={6}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Section 4: Canonical Reference Solution SQL */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Canonical Reference Solution SQL (Auto-generates Expected Output)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={orderSensitive}
                  onChange={(e) => setOrderSensitive(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0"
                />
                <span>Strict Row Order Sensitive (Requires ORDER BY)</span>
              </label>
            </div>
            <textarea
              value={solutionSql}
              onChange={(e) => setSolutionSql(e.target.value)}
              rows={4}
              placeholder="SELECT ... FROM ... WHERE ..."
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-emerald-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Section 5: Test Cases & Live Canonical Runner */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">
                  Test Cases & Seed Datasets ({testCases.length})
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Provide INSERT seed data. The platform automatically computes expected outputs by running the canonical query.
                </p>
              </div>

              <button
                onClick={handleAddTestCase}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Test Case</span>
              </button>
            </div>

            <div className="space-y-4">
              {testCases.map((tc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={tc.title}
                      onChange={(e) => {
                        const updated = [...testCases];
                        updated[idx].title = e.target.value;
                        setTestCases(updated);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-white font-medium text-xs focus:outline-none"
                    />

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-slate-400 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.isPublic}
                          onChange={(e) => {
                            const updated = [...testCases];
                            updated[idx].isPublic = e.target.checked;
                            setTestCases(updated);
                          }}
                        />
                        <span>Sample / Public (Visible to Student)</span>
                      </label>

                      <button
                        onClick={() => handleTestCanonical(idx)}
                        disabled={testingIdx === idx}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900/60 transition"
                      >
                        <Play className="w-3 h-3 fill-emerald-300" />
                        <span>{testingIdx === idx ? "Running..." : "Test Canonical Output"}</span>
                      </button>

                      {testCases.length > 1 && (
                        <button
                          onClick={() => handleRemoveTestCase(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] font-mono mb-1">
                      Seed SQL (INSERT INTO ... statements):
                    </label>
                    <textarea
                      value={tc.seedData}
                      onChange={(e) => {
                        const updated = [...testCases];
                        updated[idx].seedData = e.target.value;
                        setTestCases(updated);
                      }}
                      rows={3}
                      placeholder="INSERT INTO Employee VALUES (1, 'John', 70000);"
                      className="w-full p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Test Preview Output */}
            {testPreviewOutput && (
              <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-emerald-900/80 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-semibold text-xs">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Canonical Query Preview Verified</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    Execution time: {testPreviewOutput.executionTimeMs} ms
                  </span>
                </div>

                <TableGrid
                  columns={testPreviewOutput.columns}
                  rows={testPreviewOutput.rows}
                  title="Canonical Output Preview"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
