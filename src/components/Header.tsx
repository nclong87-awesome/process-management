import React from "react";
import {
  Activity,
  KeyRound,
  LogOut,
  RefreshCw,
  Server,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getApiBaseUrl } from "../lib/api";

interface HeaderProps {
  onManualRefresh: () => void;
  isRefreshing: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onManualRefresh, isRefreshing, onOpenSettings }) => {
  const { isAuthenticated, hasMemoryCredentials, isMockMode, toggleMockMode, logout } = useAuth();
  const baseUrl = getApiBaseUrl();

  const handleToggleMock = () => {
    toggleMockMode();
    onManualRefresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-900 shadow-xs px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left branding & environment indicator */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-none">
                ProcessManager
              </h1>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                v1.0
              </span>
              {isMockMode && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                  <Sparkles className="w-3 h-3 text-purple-600 animate-pulse" />
                  Mock Data
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-mono">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate max-w-[200px] sm:max-w-xs">
                {isMockMode ? "Mock Data Mode (Client Simulated API)" : baseUrl}
              </span>
            </div>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 justify-end">
          {/* Mock Mode Toggle Button */}
          <button
            onClick={handleToggleMock}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs ${
              isMockMode
                ? "bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            title={isMockMode ? "Click to switch to Live Backend API" : "Click to enable Sample Mock API Data mode"}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isMockMode ? "text-purple-600" : "text-slate-400"}`} />
            <span>{isMockMode ? "Mock API: ON" : "Mock API: OFF"}</span>
          </button>

          {/* Auth status indicator */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              isAuthenticated
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
            }`}
            title="Click to view Authentication & Settings"
          >
            {isAuthenticated ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ShieldX className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="hidden md:inline">
              {isMockMode ? "Mock Auth" : isAuthenticated ? "Authenticated" : "Not Authenticated"}
            </span>
            {hasMemoryCredentials && !isMockMode && (
              <span className="text-[10px] bg-emerald-200/80 px-1.5 py-0.2 rounded font-mono text-emerald-800">
                RAM
              </span>
            )}
          </button>

          {/* Manual Refresh button */}
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            title="Manual refresh process list"
            aria-label="Manual refresh process list"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
            title="Open Settings & Authentication"
            aria-label="Open Settings"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Logout button */}
          {isAuthenticated && !isMockMode && (
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
              title="Log out and clear active session"
              aria-label="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
