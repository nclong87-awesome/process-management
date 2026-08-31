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
  Server,
  Compass,
  ScrollText,
} from "lucide-react";
import { ManagedProcessStatus } from "../types";

interface ProcessTableProps {
  processes: ManagedProcessStatus[];
  selectedNames: Set<string>;
  globalEnv: string;
  pendingStartNames: Set<string>;
  pendingStopNames: Set<string>;
  isAuthenticated: boolean;
  onToggleSelect: (name: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onStart: (name: string, env: string) => void;
  onRequestStop: (process: ManagedProcessStatus) => void;
  onViewLogs: (process: ManagedProcessStatus) => void;
}

export const ProcessTable: React.FC<ProcessTableProps> = ({
  processes,
  selectedNames,
  globalEnv,
  pendingStartNames,
  pendingStopNames,
  isAuthenticated,
  onToggleSelect,
  onToggleSelectAll,
  isAllSelected,
  isSomeSelected,
  onStart,
  onRequestStop,
  onViewLogs,
}) => {
  const [copiedDirName, setCopiedDirName] = useState<string | null>(null);
  const [copiedUrlName, setCopiedUrlName] = useState<string | null>(null);
  const [rowEnvs, setRowEnvs] = useState<Record<string, string>>({});

  const handleCopyDir = (name: string, dir: string) => {
    if (dir) {
      navigator.clipboard.writeText(dir);
      setCopiedDirName(name);
      setTimeout(() => setCopiedDirName(null), 2000);
    }
  };

  const handleCopyUrl = (name: string, url: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedUrlName(name);
      setTimeout(() => setCopiedUrlName(null), 2000);
    }
  };

  const getRowEnv = (p: ManagedProcessStatus) => {
    return rowEnvs[p.name] || p.env || globalEnv || "local";
  };

  const setRowEnv = (name: string, env: string) => {
    setRowEnvs((prev) => ({ ...prev, [name]: env }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <th scope="col" className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  title={isAllSelected ? "Deselect all" : "Select all processes"}
                />
              </th>
              <th scope="col" className="py-3 px-3">
                Status
              </th>
              <th scope="col" className="py-3 px-3">
                Process Name
              </th>
              <th scope="col" className="py-3 px-3">
                PID & Port
              </th>
              <th scope="col" className="py-3 px-3">
                Environment
              </th>
              <th scope="col" className="py-3 px-3">
                Working Directory
              </th>
              <th scope="col" className="py-3 px-3">
                App URL
              </th>
              <th scope="col" className="py-3 px-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80">
            {processes.map((proc) => {
              const isSelected = selectedNames.has(proc.name);
              const isRunning = proc.status === "running";
              const isStarted = proc.status === "started";
              const isStarting = pendingStartNames.has(proc.name);
              const isStopping = pendingStopNames.has(proc.name);
              const isStartingOrStarted = isStarting || isStarted;

              const resolvedAppUrl = proc.appUrl
                ? proc.appUrl
                : proc.port
                ? `http://localhost:${proc.port}`
                : null;

              const selectedEnv = getRowEnv(proc);

              return (
                <tr
                  key={proc.name}
                  className={`transition-colors ${
                    isSelected
                      ? "bg-indigo-50/60 hover:bg-indigo-50/80"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  {/* Row Checkbox */}
                  <td className="p-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(proc.name)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-3 align-middle whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${
                        isRunning
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : isStarted
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {isRunning ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                          </span>
                          <Radio className="w-3 h-3 text-emerald-700" />
                          <span>RUNNING</span>
                        </>
                      ) : isStarted ? (
                        <>
                          <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                          <span>STARTING</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-2.5 h-2.5 text-slate-400 fill-slate-400" />
                          <span>STOPPED</span>
                        </>
                      )}
                    </span>
                  </td>

                  {/* Process Name */}
                  <td className="py-3 px-3 align-middle font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                    {proc.name}
                  </td>

                  {/* PID & Port */}
                  <td className="py-3 px-3 align-middle font-mono text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>PID: <strong className="text-slate-900">{proc.processId ?? "—"}</strong></span>
                      {proc.port && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                            <Server className="w-3 h-3" />
                            {proc.port}
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Environment Selector / Display */}
                  <td className="py-3 px-3 align-middle whitespace-nowrap">
                    {isRunning ? (
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-800">
                        {proc.env || "local"}
                      </span>
                    ) : (
                      <select
                        value={selectedEnv}
                        onChange={(e) => setRowEnv(proc.name, e.target.value)}
                        disabled={isStartingOrStarted || !isAuthenticated}
                        className="font-mono text-xs bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                      >
                        <option value="local">local</option>
                        <option value="dev">dev</option>
                        <option value="staging">staging</option>
                        <option value="production">production</option>
                      </select>
                    )}
                  </td>

                  {/* Working Directory */}
                  <td className="py-3 px-3 align-middle max-w-xs md:max-w-md">
                    <div className="flex items-center gap-1">
                      <code
                        className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-full inline-block border border-slate-200"
                        title={proc.workingDirectory}
                      >
                        {proc.workingDirectory || "—"}
                      </code>
                      {proc.workingDirectory && (
                        <button
                          onClick={() => handleCopyDir(proc.name, proc.workingDirectory)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded shrink-0"
                          title="Copy path"
                        >
                          {copiedDirName === proc.name ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* App URL */}
                  <td className="py-3 px-3 align-middle max-w-xs">
                    {resolvedAppUrl ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyUrl(proc.name, resolvedAppUrl)}
                          className="font-mono text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium truncate max-w-full flex items-center gap-1"
                          title={`Copy ${resolvedAppUrl}`}
                        >
                          <span className="truncate">{resolvedAppUrl}</span>
                          {copiedUrlName === proc.name ? (
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 text-indigo-500 shrink-0" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs font-mono">—</span>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Logs Button */}
                      <button
                        onClick={() => onViewLogs(proc)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold transition-colors"
                        title="View streaming process logs"
                      >
                        <ScrollText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Logs</span>
                      </button>

                      {/* Start / Stop Button */}
                      {isRunning ? (
                        <button
                          onClick={() => onRequestStop(proc)}
                          disabled={isStopping || !isAuthenticated}
                          className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-bold uppercase transition-colors disabled:opacity-50"
                          title="Stop process"
                        >
                          {isStopping ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                          ) : (
                            <Square className="w-3 h-3 fill-rose-600 text-rose-600" />
                          )}
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onStart(proc.name, selectedEnv)}
                          disabled={isStartingOrStarted || !isAuthenticated}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold uppercase transition-colors disabled:opacity-50 shadow-2xs"
                          title={`Start process with env=${selectedEnv}`}
                        >
                          {isStartingOrStarted ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          <span>Start</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
