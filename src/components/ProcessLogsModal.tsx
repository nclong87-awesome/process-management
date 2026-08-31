import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Terminal,
  Radio,
  Square,
  Search,
  Copy,
  Check,
  Trash2,
  ArrowDown,
  Download,
  Loader2,
  Filter,
  RefreshCw,
  Clock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ManagedProcessStatus } from "../types";
import { useProcessLogs } from "../hooks/useProcessLogs";

interface ProcessLogsModalProps {
  process: ManagedProcessStatus | null;
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onOpenSettings?: () => void;
}

export const ProcessLogsModal: React.FC<ProcessLogsModalProps> = ({
  process,
  isOpen,
  onClose,
  isAuthenticated,
  onOpenSettings,
}) => {
  // Use focused custom hook for SSE log stream lifecycle
  const {
    sinceMinutes,
    setSinceMinutes,
    logs,
    streamStatus,
    streamError,
    reconnect,
    clearLogs,
    hasConnected,
  } = useProcessLogs(process?.name ?? null, isOpen, isAuthenticated);

  // Filters & display state
  const [searchQuery, setSearchQuery] = useState("");
  const [streamFilter, setStreamFilter] = useState<"all" | "stdout" | "stderr">("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle manual scrolling to pause/resume autoScroll
  const handleScroll = () => {
    if (!logContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 40;
    if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    } else if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  };

  const handleCopyLogs = () => {
    if (filteredLogs.length === 0) return;
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.stream.toUpperCase()}] ${l.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    if (!process || logs.length === 0) return;
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.stream.toUpperCase()}] ${l.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${process.name}-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !process) return null;

  // Filter logs by stream type and search query (kept in display order)
  const filteredLogs = logs.filter((log) => {
    const matchesStream = streamFilter === "all" || log.stream === streamFilter;
    const matchesQuery =
      searchQuery === "" ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.timestamp.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStream && matchesQuery;
  });

  const stdoutCount = logs.filter((l) => l.stream === "stdout").length;
  const stderrCount = logs.filter((l) => l.stream === "stderr").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 text-slate-100 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-7xl h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono break-words">{process.name}</h3>
                <span className="text-xs text-slate-400 font-mono">
                  (PID: {process.processId ?? "—"})
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>
                  Env: <strong className="text-slate-300 font-mono">{process.env || "local"}</strong>
                </span>
                <span>•</span>
                <span>
                  Dir:{" "}
                  <code className="text-slate-300 font-mono truncate max-w-[200px] inline-block align-bottom">
                    {process.workingDirectory}
                  </code>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Stream Status Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border">
              {streamStatus === "live" ? (
                <span className="flex items-center gap-1.5 text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>LIVE STREAM</span>
                </span>
              ) : streamStatus === "connecting" ? (
                <span className="flex items-center gap-1.5 text-amber-400 border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>CONNECTING...</span>
                </span>
              ) : streamStatus === "ended" ? (
                <span className="flex items-center gap-1.5 text-slate-400 border-slate-700 bg-slate-800 px-2.5 py-0.5 rounded-full">
                  <Radio className="w-3.5 h-3.5 text-slate-500" />
                  <span>PROCESS EXITED</span>
                </span>
              ) : streamStatus === "error" ? (
                <span className="flex items-center gap-1.5 text-rose-400 border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>STREAM ERROR</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-400 border-slate-700 bg-slate-800 px-2.5 py-0.5 rounded-full">
                  <Square className="w-3 h-3 fill-slate-500 text-slate-500" />
                  <span>IDLE</span>
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Close log viewer (Esc)"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 px-5 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0 text-xs">
          {/* History Window Control (defaults to 10 min, sends sinceMinutes in query params) */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <label htmlFor="history-window-select" className="text-slate-300 font-semibold font-mono text-xs">
              History Window:
            </label>
            <select
              id="history-window-select"
              value={sinceMinutes}
              onChange={(e) => setSinceMinutes(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value={1}>1 min (sinceMinutes=1)</option>
              <option value={5}>5 mins (sinceMinutes=5)</option>
              <option value={10}>10 mins (sinceMinutes=10)</option>
              <option value={30}>30 mins (sinceMinutes=30)</option>
              <option value={60}>60 mins (sinceMinutes=60)</option>
              <option value={180}>3 hours (sinceMinutes=180)</option>
            </select>
          </div>

          {/* Search filter input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter log messages..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Stream selector tabs */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg shrink-0">
            <span className="text-[11px] text-slate-500 px-1.5 flex items-center gap-1 font-semibold">
              <Filter className="w-3 h-3" /> Stream:
            </span>
            <button
              onClick={() => setStreamFilter("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                streamFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setStreamFilter("stdout")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                streamFilter === "stdout"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                  : "text-slate-400 hover:text-emerald-400"
              }`}
            >
              stdout ({stdoutCount})
            </button>
            <button
              onClick={() => setStreamFilter("stderr")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                streamFilter === "stderr"
                  ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                  : "text-slate-400 hover:text-rose-400"
              }`}
            >
              stderr ({stderrCount})
            </button>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-semibold transition-colors ${
                autoScroll
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle auto-scrolling to bottom on new log entry"
            >
              <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? "animate-bounce" : ""}`} />
              <span>Auto-scroll</span>
            </button>

            <button
              onClick={handleCopyLogs}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg font-semibold transition-colors disabled:opacity-40"
              title="Copy visible logs to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            <button
              onClick={handleDownloadLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg font-semibold transition-colors disabled:opacity-40"
              title="Download all logs as .log file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Export</span>
            </button>

            <button
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors disabled:opacity-40"
              title="Clear log screen buffer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Log Viewer Screen */}
        <div
          ref={logContainerRef}
          onScroll={handleScroll}
          className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-y-auto space-y-1 relative selection:bg-indigo-500/30 selection:text-indigo-200"
        >
          {/* Non-blocking Error Banner: Keeps existing entries visible beneath! */}
          {streamError && (
            <div className="mb-4 p-3 bg-rose-950/80 border border-rose-700/80 rounded-xl flex items-start justify-between gap-3 text-rose-200 text-xs shadow-md">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-300">Log Stream Error</h4>
                  <p className="mt-0.5 text-rose-200/90 leading-relaxed font-sans">{streamError.message}</p>
                  {logs.length > 0 && (
                    <p className="mt-1 text-[11px] text-rose-300/70 font-sans italic">
                      Previous {logs.length} log entries are retained and displayed below.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-sans">
                {streamError.isAuthError && onOpenSettings && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold border border-amber-400/50 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Open Settings</span>
                  </button>
                )}
                <button
                  onClick={reconnect}
                  className="flex items-center gap-1.5 px-3 py-1 bg-rose-900 hover:bg-rose-800 text-rose-100 rounded-lg text-xs font-semibold border border-rose-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${streamStatus === "connecting" ? "animate-spin" : ""}`} />
                  <span>Reconnect</span>
                </button>
              </div>
            </div>
          )}

          {/* State 1: Connecting State */}
          {streamStatus === "connecting" && logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-16 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm font-sans font-medium text-slate-300">Establishing log stream connection...</p>
              <p className="text-xs text-slate-500 font-mono">
                GET /api/processes/{encodeURIComponent(process.name)}/logs?sinceMinutes={sinceMinutes}
              </p>
            </div>
          )}

          {/* State 2: No-Retained-Logs State (connected, but 0 entries in history window) */}
          {(streamStatus === "live" || streamStatus === "ended" || hasConnected) && logs.length === 0 && !streamError && (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-16 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-indigo-400/70" />
              <p className="text-sm font-sans font-semibold text-slate-300">Stream Connected (No Retained Logs)</p>
              <p className="text-xs text-slate-400 font-sans max-w-sm leading-relaxed">
                The log stream is active, but no replayed log entries were found within the selected history window (last <strong className="font-mono text-indigo-300">{sinceMinutes} minutes</strong>). Listening for new stdout/stderr events...
              </p>
            </div>
          )}

          {/* State 3: Process Exited State (stream ended, showing logs if any) */}
          {streamStatus === "ended" && logs.length > 0 && (
            <div className="mb-3 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2 text-slate-400 text-xs font-sans">
              <Radio className="w-3.5 h-3.5 text-slate-500" />
              <span>Process log stream completed / closed.</span>
            </div>
          )}

          {/* Filtered Empty State */}
          {logs.length > 0 && filteredLogs.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-sans">
              No logs matching query &apos;{searchQuery}&apos; in stream filter &apos;{streamFilter}&apos;.
            </div>
          )}

          {/* Logs Display List (Kept in chronological order) */}
          {filteredLogs.map((log, index) => {
            const isStderr = log.stream === "stderr";
            const formattedTime = new Date(log.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              fractionalSecondDigits: 3,
            });

            return (
              <div
                key={`${index}-${log.timestamp}`}
                className={`flex items-start gap-3 py-1 px-2.5 rounded hover:bg-slate-900/90 group transition-colors font-mono leading-relaxed ${
                  isStderr
                    ? "bg-rose-950/25 border-l-2 border-rose-500/80 text-rose-200"
                    : "border-l-2 border-emerald-500/60 text-slate-200"
                }`}
              >
                {/* Line index */}
                <span className="text-[10px] text-slate-600 select-none w-8 shrink-0 text-right group-hover:text-slate-400">
                  {index + 1}
                </span>

                {/* Timestamp */}
                <span className="text-[11px] text-slate-400 shrink-0 font-mono" title={log.timestamp}>
                  {isNaN(Date.parse(log.timestamp)) ? log.timestamp : formattedTime}
                </span>

                {/* Log Message Content */}
                <span className="break-all whitespace-pre-wrap flex-1">{log.message}</span>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 shrink-0 font-sans">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-white font-mono">{filteredLogs.length}</strong> of{" "}
              <strong className="text-white font-mono">{logs.length}</strong> log entries
            </span>
            {streamStatus === "live" && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Receiving Live SSE Events
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-xs transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
