import React, { useState } from "react";
import {
  ShieldAlert,
  KeyRound,
  Lock,
  LogOut,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Server,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getApiBaseUrl } from "../lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { token, isAuthenticated, hasMemoryCredentials, authError, login, logout, clearAuthError } = useAuth();

  const [clientIdInput, setClientIdInput] = useState("");
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl = getApiBaseUrl();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!clientIdInput.trim() || !clientSecretInput.trim()) {
      setLocalError("Please enter both Client ID and Client Secret.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(clientIdInput, clientSecretInput);
      setClientIdInput("");
      setClientSecretInput("");
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedExpiry = token
    ? new Date(token.expiresAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-labelledby="settings-modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
            <KeyRound className="w-5 h-5 text-indigo-600 shrink-0" />
            <span id="settings-modal-title">Authentication & Settings</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            title="Close Settings"
            aria-label="Close settings dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Active Status Overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
              <span>Session Status</span>
              <span className="flex items-center gap-1 text-slate-500 font-mono text-[11px] lowercase">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                {baseUrl}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                {isAuthenticated ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <div>
                  <div className="text-slate-400 text-[11px] font-medium">OAuth Token</div>
                  <div className="font-semibold text-slate-900">
                    {isAuthenticated ? "Valid Bearer Token" : "No Valid Token"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <div className="text-slate-400 text-[11px] font-medium">Token Expires</div>
                  <div className="font-semibold text-slate-900">{formattedExpiry || "Not Active"}</div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span>In-Memory Secret Credentials:</span>
              <span className={`font-mono font-bold ${hasMemoryCredentials ? "text-emerald-700" : "text-amber-700"}`}>
                {hasMemoryCredentials ? "Active in RAM" : "Not set"}
              </span>
            </div>
          </div>

          {/* Security Notice Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <span className="font-bold text-amber-950">Client Secret Security Notice</span>
              <p className="leading-relaxed">
                Client secrets are sensitive. This app keeps your client secret <strong>strictly in React memory</strong> and never writes it to <code>localStorage</code>, <code>sessionStorage</code>, or network logs.
              </p>
              <p className="text-[11px] text-amber-800">
                Note: In browser-only environments, client secrets cannot be made strictly confidential against client inspection.
              </p>
            </div>
          </div>

          {/* Error alerts */}
          {(localError || authError) && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {/* Form to enter OAuth Client ID and Secret */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="client-id" className="block text-xs font-bold text-slate-700 mb-1.5">
                OAuth Client ID <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="client-id"
                  type="text"
                  required
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="e.g. process-manager-client"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="client-secret" className="block text-xs font-bold text-slate-700 mb-1.5">
                OAuth Client Secret <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="client-secret"
                  type={showSecret ? "text" : "password"}
                  required
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  placeholder="Enter secret (stored in RAM only)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  title={showSecret ? "Hide secret" : "Show secret"}
                  aria-label={showSecret ? "Hide secret" : "Show secret"}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                Submits to <code>POST /oauth/token</code> via <code>grant_type=client_credentials</code>.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors mr-auto uppercase tracking-wider"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-50 uppercase tracking-wider"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Authenticating..." : "Authenticate & Save Token"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
