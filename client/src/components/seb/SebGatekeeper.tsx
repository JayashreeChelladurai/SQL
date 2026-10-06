import React from "react";
import {
  ShieldCheck,
  Play,
  Download,
  Sparkles,
  Monitor,
  Rocket,
  ArrowLeft,
  KeyRound,
  FlaskConical,
} from "lucide-react";
import { api } from "../../services/api";

interface SebGatekeeperProps {
  assessment: {
    id: string;
    title: string;
    code: string;
    durationMinutes: number;
    sebQuitPassword?: string;
  };
  onBack: () => void;
  onBypassForTesting?: () => void;
}

export const SebGatekeeper: React.FC<SebGatekeeperProps> = ({
  assessment,
  onBack,
  onBypassForTesting,
}) => {
  const sebDownloadUrl = api.getSebConfigUrl(assessment.id);

  // Construct seb:// protocol link for 1-click launch of pre-installed SEB
  const host = window.location.host;
  const protocol = window.location.protocol.replace(":", "");
  const sebProtocolUrl = `${protocol === "https" ? "sebs" : "seb"}://${host}/?code=${encodeURIComponent(
    assessment.code
  )}`;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 font-sans">
      <div className="max-w-2xl w-full my-auto space-y-6">
        <div className="bg-slate-900 border border-emerald-900/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-6">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500" />

          {/* Shield Icon */}
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Safe Exam Browser (SEB) Mandatory</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {assessment.title}
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              This SQL assessment requires Safe Exam Browser for integrity and anti-cheat enforcement. Standard web browsers cannot access the examination.
            </p>
          </div>

          {/* Assessment Badges */}
          <div className="flex flex-wrap justify-center gap-3 text-xs font-mono">
            <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Access Code</span>
              <span className="font-bold text-emerald-400 text-sm">{assessment.code}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Duration</span>
              <span className="font-bold text-white text-sm">{assessment.durationMinutes} Mins</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Exit Password</span>
              <span className="font-bold text-sky-400 text-sm font-mono">exit123</span>
            </div>
          </div>

          {/* Option 1: 1-Click Launch Pre-installed SEB */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-emerald-400" />
                <span>Option 1: Launch Pre-Installed SEB (1-Click)</span>
              </h3>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-800/40">
                Recommended
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If Safe Exam Browser is installed on your computer, click below to launch the assessment directly in SEB:
            </p>

            <a
              href={sebProtocolUrl}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg shadow-emerald-950 text-xs"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Safe Exam Browser Directly</span>
            </a>
          </div>

          {/* Option 2: Download .seb File */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Download className="w-4 h-4 text-sky-400" />
              <span>Option 2: Download Configuration File (.seb)</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Download the official configuration file and double-click it to start SEB:
            </p>

            <a
              href={sebDownloadUrl}
              download
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-semibold py-2.5 px-4 rounded-xl transition text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download {assessment.code}.seb Config</span>
            </a>
          </div>

          {/* Option 3: Manual Launch Instructions */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2 text-xs">
            <h4 className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs">
              <Monitor className="w-3.5 h-3.5 text-slate-400" />
              <span>Manual Start Instructions:</span>
            </h4>
            <ol className="list-decimal list-inside text-slate-400 space-y-1 text-[11px] leading-relaxed">
              <li>Launch <strong>Safe Exam Browser</strong> from your Start Menu or Applications.</li>
              <li>Navigate to <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded">http://{host}</code></li>
              <li>Enter Access Code <strong className="text-emerald-400 font-mono">{assessment.code}</strong> with your Roll Number to begin.</li>
            </ol>
          </div>

          {/* Footer Controls & Testing Bypass */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>

            {onBypassForTesting && (
              <button
                onClick={onBypassForTesting}
                className="flex items-center gap-1 text-amber-400/80 hover:text-amber-300 bg-amber-950/40 border border-amber-900/60 px-2.5 py-1 rounded-lg text-[11px] font-mono transition"
                title="Bypass SEB check for development and testing on non-SEB browsers"
              >
                <FlaskConical className="w-3 h-3" />
                <span>Testing Bypass (Dev Mode)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
