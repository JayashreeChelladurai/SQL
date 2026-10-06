import React from "react";
import { StudentQuestion } from "../../types";
import { Bookmark, CheckCircle2, Circle } from "lucide-react";

interface QuestionPaletteProps {
  questions: StudentQuestion[];
  currentIndex: number;
  onSelectQuestion: (index: number) => void;
  flaggedQuestions: string[];
  drafts: Record<string, string>;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentIndex,
  onSelectQuestion,
  flaggedQuestions,
  drafts,
}) => {
  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs">
      <div className="flex items-center justify-between font-semibold text-slate-200 mb-2 pb-2 border-b border-slate-800">
        <span>Question Palette</span>
        <span className="text-[11px] text-slate-400 font-mono">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Grid of Question Pills */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2 mb-3">
        {questions.map((q, idx) => {
          const isActive = idx === currentIndex;
          const isFlagged = flaggedQuestions.includes(q.id);
          const hasSubmission = Boolean(q.submission);
          const hasDraft = Boolean(drafts[q.id]?.trim());

          let bgClass = "bg-slate-800 text-slate-300 hover:bg-slate-700";
          let borderClass = "border-transparent";

          if (isFlagged) {
            bgClass = "bg-purple-950/80 text-purple-300";
            borderClass = "border-purple-600";
          } else if (hasSubmission) {
            bgClass = "bg-emerald-950/80 text-emerald-300";
            borderClass = "border-emerald-600";
          } else if (hasDraft) {
            bgClass = "bg-blue-950/60 text-blue-300";
            borderClass = "border-blue-700";
          }

          if (isActive) {
            borderClass = "border-sky-400 ring-2 ring-sky-400/40";
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectQuestion(idx)}
              className={`relative flex flex-col items-center justify-center p-2 rounded border font-mono font-bold text-xs transition ${bgClass} ${borderClass}`}
            >
              <span>Q{idx + 1}</span>
              <span className="text-[10px] font-normal text-slate-400 font-sans">
                {q.marks}m
              </span>
              {isFlagged && (
                <Bookmark className="w-2.5 h-2.5 text-purple-400 absolute top-1 right-1 fill-purple-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 border-t border-slate-800 pt-2 font-mono">
        <div className="flex items-center gap-1.5">
          <Circle className="w-2.5 h-2.5 text-slate-500 fill-slate-500" />
          <span>Unvisited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="w-2.5 h-2.5 text-sky-400 fill-sky-400" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
          <span>Submitted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Bookmark className="w-2.5 h-2.5 text-purple-400 fill-purple-400" />
          <span>Review</span>
        </div>
      </div>
    </div>
  );
};
