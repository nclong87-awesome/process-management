import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Header } from "./components/Header";
import { ProcessList } from "./components/ProcessList";
import { SettingsModal } from "./components/SettingsModal";
import { getApiBaseUrl } from "./lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function WorkspaceContent() {
  const { isAuthenticated, isLoginOpen, setIsLoginOpen, token } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const baseUrl = getApiBaseUrl();

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["processes"] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const truncatedToken = token?.accessToken
    ? `${token.accessToken.substring(0, 6)}...${token.accessToken.substring(token.accessToken.length - 4)}`
    : "None";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Top operational header */}
      <Header
        onManualRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        onOpenSettings={() => setIsLoginOpen(true)}
      />

      {/* Main Process Dashboard Workspace */}
      <main className="flex-1 pb-12">
        <ProcessList onOpenSettings={() => setIsLoginOpen(true)} />
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[11px] font-medium text-slate-500 gap-2">
        <div className="flex items-center space-x-3">
          <span className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-2 ${isAuthenticated ? "bg-emerald-500" : "bg-amber-400"}`}></span>
            {isAuthenticated ? "Backend Connected" : "Authentication Pending"}
          </span>
          <span className="text-slate-300">|</span>
          <span className="font-mono">API: {baseUrl}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Session Token:</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-indigo-600 font-semibold">
            {truncatedToken}
          </span>
        </div>
      </footer>

      {/* Settings / Authentication Modal */}
      <SettingsModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

