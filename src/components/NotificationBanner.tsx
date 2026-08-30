import React from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type NotificationMessage = {
  id: string;
  type: "error" | "success" | "info";
  title?: string;
  message: string;
  details?: string;
};

interface NotificationProps {
  notifications: NotificationMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationBanner: React.FC<NotificationProps> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {notifications.map((n) => {
        const isError = n.type === "error";
        const isSuccess = n.type === "success";

        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
              isError
                ? "bg-rose-50 border-rose-200 text-rose-950"
                : isSuccess
                ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                : "bg-white border-slate-200 text-slate-900"
            }`}
            role="alert"
          >
            <div className="shrink-0 mt-0.5">
              {isError && <AlertTriangle className="w-5 h-5 text-rose-600" />}
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {!isError && !isSuccess && <Info className="w-5 h-5 text-indigo-600" />}
            </div>

            <div className="flex-1 min-w-0">
              {n.title && <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5">{n.title}</h4>}
              <p className="text-sm font-medium leading-snug break-words">{n.message}</p>
              {n.details && (
                <p className="text-xs mt-1 font-mono bg-slate-100/80 border border-slate-200/80 p-1.5 rounded overflow-x-auto max-h-24 text-slate-800">
                  {n.details}
                </p>
              )}
            </div>

            <button
              onClick={() => onDismiss(n.id)}
              className="shrink-0 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
