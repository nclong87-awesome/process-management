import React, { useState } from "react";
import {
  Play,
  Square,
  Loader2,
  ExternalLink,
  Folder,
  Radio,
  Copy,
  Check,
  Terminal,
  Server,
  Compass,
  ScrollText,
} from "lucide-react";
import { ManagedProcessStatus } from "../types";

interface ProcessCardProps {
  process: ManagedProcessStatus;
  globalEnv: string;
  isStarting: boolean;
  isStopping: boolean;
  isAuthenticated: boolean;
  isSelected?: boolean;
  onToggleSelect?: (name: string) => void;
  onStart: (name: string, env: string) => void;
  onRequestStop: (process: ManagedProcessStatus) => void;
  onViewLogs: (process: ManagedProcessStatus) => void;
}

export const ProcessCard: React.FC<ProcessCardProps> = ({
  process,
  globalEnv,
  isStarting,
  isStopping,
  isAuthenticated,
  isSelected = false,
  onToggleSelect,
  onStart,
  onRequestStop,
  onViewLogs,
}) => {
  // Local state for the start environment input (defaults to globalEnv or process.env or "local")
  const [selectedEnv, setSelectedEnv] = useState<string>(globalEnv || process.env || "local");
  const [copiedDir, setCopiedDir] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isLocalStarting, setIsLocalStarting] = useState(false);

  React.useEffect(() => {
    if (process.status === "running" || process.status === "stopped") {
      setIsLocalStarting(false);
    }
  }, [process.status]);

  const isRunning = process.status === "running";
  const isStarted = process.status === "started";
  const isStartingOrStarted = isStarting || isStarted || isLocalStarting;

  const handleCopyDir = () => {
    if (process.workingDirectory) {
      navigator.clipboard.writeText(process.workingDirectory);
      setCopiedDir(true);
      setTimeout(() => setCopiedDir(false), 2000);
    }
  };

  const handleCopyUrl = () => {
    if (resolvedAppUrl) {
      navigator.clipboard.writeText(resolvedAppUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLocalStarting(true);
    onStart(process.name, selectedEnv || "local");
  };

  const resolvedAppUrl = process.appUrl
    ? process.appUrl
    : process.port
    ? `http://localhost:${process.port}`
    : null;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all shadow-sm ${
        isSelected
          ? "bg-indigo-50/40 border-indigo-400 ring-2 ring-indigo-500/20 shadow-indigo-100"
          : isRunning
          ? "bg-white border-slate-200 hover:border-indigo-300"
          : "bg-white/80 border-slate-200 border-dashed bg-slate-50/50 hover:border-indigo-300"
      }`}
    >
      {/* Top Header Row */}
      <div>
        {/* Header Bar: Selection Checkbox, Status Badge & Logs Action */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            {onToggleSelect && (
              <label
                className="flex items-center justify-center cursor-pointer p-0.5 rounded hover:bg-slate-200/60 transition-colors"
                title={`Select process ${process.name}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(process.name)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </label>
            )}

            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide shrink-0 ${
                isRunning
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : isStarted
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
              role="status"
              aria-label={`Process status: ${process.status}`}
            >
              {isRunning ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <Radio className="w-3.5 h-3.5 text-emerald-700" />
                  <span>RUNNING</span>
                </>
              ) : isStarted ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span>STARTING</span>
                </>
              ) : (
                <>
                  <Square className="w-3 h-3 text-slate-400 fill-slate-400" />
                  <span>STOPPED</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onViewLogs(process)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-md text-xs font-semibold transition-colors shrink-0"
            title={`View logs for ${process.name}`}
            aria-label={`View logs for ${process.name}`}
          >
            <ScrollText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Logs</span>
          </button>
        </div>

        {/* Process Name - Full Width */}
        <div className="mb-1">
          <h3
            className={`text-base sm:text-lg font-bold font-mono tracking-tight leading-snug break-words ${
              isRunning ? "text-slate-900" : "text-slate-700"
            }`}
            title={process.name}
          >
            {process.name}
          </h3>
        </div>

        {/* PID & Port Details */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-3">
          <span>PID: <strong className="text-slate-800 font-semibold">{process.processId !== null ? process.processId : "—"}</strong></span>
          {process.port && (
            <>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-indigo-600 font-medium">
                <Server className="w-3 h-3 text-indigo-500" />
                Port {process.port}
              </span>
            </>
          )}
        </div>

        {/* Process Meta Details */}
        <div className="space-y-2.5 my-4 bg-slate-50 rounded-lg p-3 border border-slate-200/80 text-xs">
          {/* Environment */}
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              Configured Env:
            </span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-medium">
              {process.env || "local"}
            </span>
          </div>

          {/* App URL Copy Action */}
          {resolvedAppUrl && (
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                App URL:
              </span>
              <div className="flex items-center gap-1.5 min-w-0 max-w-[220px] sm:max-w-[260px]">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="font-mono text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200/80 flex items-center gap-1.5 transition-all font-medium truncate group cursor-pointer"
                  title={`Copy ${resolvedAppUrl} to clipboard`}
                  aria-label={`Copy ${resolvedAppUrl} to clipboard`}
                >
                  <span className="truncate max-w-[170px]">{resolvedAppUrl}</span>
                  {copiedUrl ? (
                    <span className="flex items-center gap-0.5 text-emerald-600 text-[11px] font-sans font-bold shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied!
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-700 shrink-0" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Working Directory */}
          <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60">
            <span className="text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              Dir:
            </span>
            <div className="flex items-center gap-1.5 min-w-0 max-w-[220px] sm:max-w-[260px]">
              <code
                className="font-mono text-[11px] text-slate-700 bg-white px-1.5 py-0.5 rounded truncate border border-slate-200"
                title={process.workingDirectory}
              >
                {process.workingDirectory || "—"}
              </code>
              <button
                type="button"
                onClick={handleCopyDir}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors shrink-0"
                title="Copy working directory"
                aria-label="Copy working directory path"
              >
                {copiedDir ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="pt-2 border-t border-slate-200/80 mt-auto">
        {isRunning ? (
          /* Running Actions */
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onViewLogs(process)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-bold transition-colors"
              title={`Stream live logs for ${process.name}`}
            >
              <ScrollText className="w-3.5 h-3.5 text-indigo-600" />
              <span>View Logs</span>
            </button>

            <button
              type="button"
              onClick={() => onRequestStop(process)}
              disabled={isStopping || !isAuthenticated}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold uppercase transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
              title={!isAuthenticated ? "Login required to stop process" : "Stop process with confirmation"}
            >
              {isStopping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  <span>Stopping...</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 fill-current text-rose-600" />
                  <span>Stop</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Stopped / Start Action Form */
          <form onSubmit={handleStartSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500">
              <label htmlFor={`env-input-${process.name}`} className="text-[11px] font-bold text-slate-500 font-mono uppercase shrink-0">
                env:
              </label>
              <select
                id={`env-input-${process.name}`}
                value={selectedEnv}
                onChange={(e) => setSelectedEnv(e.target.value)}
                disabled={isStartingOrStarted || !isAuthenticated}
                className="bg-transparent text-xs text-slate-800 font-mono font-semibold focus:outline-none w-full cursor-pointer disabled:cursor-not-allowed"
              >
                <option value="local">local</option>
                <option value="dev">dev</option>
                <option value="staging">staging</option>
                <option value="production">production</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isStartingOrStarted || !isAuthenticated}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              title={!isAuthenticated ? "Login required to start process" : isStartingOrStarted ? "Process is starting..." : `Start process with env=${selectedEnv}`}
            >
              {isStartingOrStarted ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Process</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
