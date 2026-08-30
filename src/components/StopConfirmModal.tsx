import React from "react";
import { AlertOctagon, Loader2, X } from "lucide-react";
import { ManagedProcessStatus } from "../types";

interface StopConfirmModalProps {
  process: ManagedProcessStatus | null;
  isOpen: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const StopConfirmModal: React.FC<StopConfirmModalProps> = ({
  process,
  isOpen,
  isPending,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !process) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white border border-slate-200 rounded-xl max-w-md w-full shadow-2xl overflow-hidden"
        role="dialog"
        aria-labelledby="stop-modal-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5 text-rose-700 font-semibold text-base">
            <AlertOctagon className="w-5 h-5 shrink-0" />
            <span id="stop-modal-title">Confirm Stop Process</span>
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

        <div className="p-5 space-y-4">
          <p className="text-slate-700 text-sm leading-relaxed">
            Are you sure you want to stop the managed process <strong className="text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{process.name}</strong>?
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Process Name:</span>
              <span className="text-slate-900 font-semibold">{process.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Process ID (PID):</span>
              <span className="text-slate-900 font-semibold">{process.processId ?? "N/A"}</span>
            </div>
            {process.port && (
              <div className="flex justify-between">
                <span className="text-slate-400">Listening Port:</span>
                <span className="text-indigo-600 font-semibold">{process.port}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Environment:</span>
              <span className="text-slate-800 font-semibold">{process.env || "local"}</span>
            </div>
          </div>

          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            Stopping this process will terminate its listener. Any active requests to this process will fail.
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
                <span>Stopping Process...</span>
              </>
            ) : (
              <span>Stop Process</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
