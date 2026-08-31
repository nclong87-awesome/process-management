import React from "react";
import { Play, Square, Loader2, CheckSquare, XCircle, List, LayoutGrid, Compass } from "lucide-react";

interface BulkToolbarProps {
  selectedCount: number;
  totalCount: number;
  selectedRunningCount: number;
  selectedStoppedCount: number;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  bulkEnv: string;
  onBulkEnvChange: (env: string) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBulkStart: () => void;
  onBulkStop: () => void;
  isBulkStarting: boolean;
  isBulkStopping: boolean;
  isAuthenticated: boolean;
  viewMode: "table" | "grid";
  onViewModeChange: (mode: "table" | "grid") => void;
}

export const BulkToolbar: React.FC<BulkToolbarProps> = ({
  selectedCount,
  totalCount,
  selectedRunningCount,
  selectedStoppedCount,
  isAllSelected,
  isSomeSelected,
  bulkEnv,
  onBulkEnvChange,
  onToggleSelectAll,
  onClearSelection,
  onBulkStart,
  onBulkStop,
  isBulkStarting,
  isBulkStopping,
  isAuthenticated,
  viewMode,
  onViewModeChange,
}) => {
  const hasSelection = selectedCount > 0;

  return (
    <div
      className={`rounded-xl border p-3.5 transition-all shadow-xs ${
        hasSelection
          ? "bg-indigo-50/80 border-indigo-200 shadow-indigo-100/50"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left Side: Multi-select Checkbox & Counter */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isSomeSelected;
              }}
              onChange={onToggleSelectAll}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">
              {hasSelection ? (
                <span className="text-indigo-900 font-mono">
                  {selectedCount} of {totalCount} selected
                </span>
              ) : (
                <span className="text-slate-600 font-mono">Select All ({totalCount})</span>
              )}
            </span>
          </label>

          {hasSelection && (
            <button
              onClick={onClearSelection}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs transition-colors"
              title="Clear current selection"
            >
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Deselect</span>
            </button>
          )}
        </div>

        {/* Right Side: Bulk Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Environment selector for Bulk Actions */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
            <Compass className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 font-mono">Bulk profile:</span>
            <select
              value={bulkEnv}
              onChange={(e) => onBulkEnvChange(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-indigo-700 focus:outline-none cursor-pointer"
            >
              <option value="local">local</option>
              <option value="dev">dev</option>
              <option value="staging">staging</option>
              <option value="production">production</option>
            </select>
          </div>

          {/* Bulk Start Button */}
          <button
            onClick={onBulkStart}
            disabled={
              !isAuthenticated ||
              !hasSelection ||
              selectedStoppedCount === 0 ||
              isBulkStarting ||
              isBulkStopping
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              selectedStoppedCount === 0
                ? "No stopped processes selected for bulk start"
                : `Start ${selectedStoppedCount} selected stopped process(es)`
            }
          >
            {isBulkStarting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Bulk Start ({selectedStoppedCount})</span>
              </>
            )}
          </button>

          {/* Bulk Stop Button */}
          <button
            onClick={onBulkStop}
            disabled={
              !isAuthenticated ||
              !hasSelection ||
              selectedRunningCount === 0 ||
              isBulkStarting ||
              isBulkStopping
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold uppercase transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              selectedRunningCount === 0
                ? "No running processes selected for bulk stop"
                : `Stop ${selectedRunningCount} selected running process(es)`
            }
          >
            {isBulkStopping ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                <span>Stopping...</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 fill-current text-rose-600" />
                <span>Bulk Stop ({selectedRunningCount})</span>
              </>
            )}
          </button>

          {/* View Toggle (Table / Grid) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 ml-1">
            <button
              onClick={() => onViewModeChange("table")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "table"
                  ? "bg-slate-100 text-indigo-600 font-bold"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Table view"
              aria-label="Switch to Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("grid")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "grid"
                  ? "bg-slate-100 text-indigo-600 font-bold"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Grid card view"
              aria-label="Switch to Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
