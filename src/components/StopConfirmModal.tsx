import React from "react";
import { AlertOctagon, Loader2, X } from "lucide-react";
import { ManagedProcessStatus } from "../types";

interface StopConfirmModalProps {
  process?: ManagedProcessStatus | null;
  processes?: ManagedProcessStatus[];
  isOpen: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const StopConfirmModal: React.FC<StopConfirmModalProps> = ({
  process,
  processes = [],
  isOpen,
  isPending,
  onConfirm,
  onCancel,
}) => {
  const targetList = processes.length > 0 ? processes : process ? [process] : [];
  if (!isOpen || targetList.length === 0) return null;

  const isBulk = targetList.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden"
        role="dialog"
        aria-labelledby="stop-modal-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5 text-rose-700 font-semibold text-base">
            <AlertOctagon className="w-5 h-5 shrink-0" />
            <span id="stop-modal-title">
              {isBulk ? `Confirm Bulk Stop (${targetList.length} Processes)` : "Confirm Stop Process"}
            </span>
          </div>
          <button
            onClick={onCancel}
            disabled={isPending}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors disabled:opacity-50"
            title="Cancel"
            aria-label="Cancel stop dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {isBulk ? (
            <p className="text-slate-700 text-sm leading-relaxed">
              Are you sure you want to stop <strong className="text-slate-900 font-bold">{targetList.length}</strong> selected managed processes?
            </p>
          ) : (
            <p className="text-slate-700 text-sm leading-relaxed">
              Are you sure you want to stop the managed process{" "}
              <strong className="text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {targetList[0].name}
              </strong>
              ?
            </p>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-2 font-mono divide-y divide-slate-200/80">
            {targetList.map((p) => (
              <div key={p.name} className="pt-2 first:pt-0 space-y-1">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>{p.name}</span>
                  {p.port && <span className="text-indigo-600">Port {p.port}</span>}
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>PID: {p.processId ?? "N/A"}</span>
                  <span>Profile: {p.launchProfile || p.env || "local"}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            Stopping {isBulk ? "these processes" : "this process"} will terminate listener connections. Any active requests will fail.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 rounded-lg transition-colors border border-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 uppercase tracking-wide"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Stopping {isBulk ? `${targetList.length} Processes...` : "Process..."}</span>
              </>
            ) : (
              <span>Stop {isBulk ? `${targetList.length} Processes` : "Process"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
