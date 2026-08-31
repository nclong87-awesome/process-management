import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  KeyRound,
  Compass,
  Radio,
  Square,
  Activity,
  Layers,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { fetchProcesses, startProcess, stopProcess, ApiError } from "../lib/api";
import { ManagedProcessStatus } from "../types";
import { ProcessCard } from "./ProcessCard";
import { ProcessTable } from "./ProcessTable";
import { BulkToolbar } from "./BulkToolbar";
import { StopConfirmModal } from "./StopConfirmModal";
import { ProcessLogsModal } from "./ProcessLogsModal";
import { NotificationBanner, NotificationMessage } from "./NotificationBanner";
import { useAuth } from "../context/AuthContext";

interface ProcessListProps {
  onOpenSettings: () => void;
}

export const ProcessList: React.FC<ProcessListProps> = ({ onOpenSettings }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated, setIsLoginOpen, isMockMode, toggleMockMode, resetMockDataStore } = useAuth();

  const handleEnableMockMode = () => {
    toggleMockMode(true);
    queryClient.invalidateQueries({ queryKey: ["processes"] });
  };

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped">("all");
  const [globalEnv, setGlobalEnv] = useState("local");
  const [bulkEnv, setBulkEnv] = useState("local");
  const [processToStop, setProcessToStop] = useState<ManagedProcessStatus | null>(null);
  const [bulkStopTargets, setBulkStopTargets] = useState<ManagedProcessStatus[]>([]);
  const [selectedLogsProcessName, setSelectedLogsProcessName] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  // Selection state & View mode
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isBulkStarting, setIsBulkStarting] = useState(false);
  const [isBulkStopping, setIsBulkStopping] = useState(false);

  // Track pending mutation names
  const [pendingStartNames, setPendingStartNames] = useState<Set<string>>(new Set());
  const [pendingStopNames, setPendingStopNames] = useState<Set<string>>(new Set());

  const addNotification = (type: "error" | "success" | "info", message: string, title?: string, details?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    const newNotif: NotificationMessage = { id, type, message, title, details };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);

    if (type !== "error") {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    }
  };

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // TanStack Query for server-state process fetching
  const {
    data: processes = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<ManagedProcessStatus[], Error>({
    queryKey: ["processes"],
    queryFn: fetchProcesses,
    enabled: isAuthenticated,
    staleTime: 5000,
    retry: 1,
  });

  // Start process mutation
  const startMutation = useMutation({
    onMutate: async ({ name }) => {
      setPendingStartNames((prev) => new Set(prev).add(name));
      queryClient.setQueryData<ManagedProcessStatus[]>(["processes"], (old) => {
        if (!old) return old;
        return old.map((p) =>
          p.name === name
            ? { ...p, status: "started" }
            : p
        );
      });
    },
    mutationFn: async ({ name, env }: { name: string; env: string }) => {
      return await startProcess(name, env);
    },
    onSuccess: (data) => {
      addNotification(
        "success",
        `Started process '${data.name}' (PID: ${data.processId})`,
        "Process Started"
      );
      queryClient.setQueryData<ManagedProcessStatus[]>(["processes"], (old) => {
        if (!old) return old;
        return old.map((p) =>
          p.name === data.name
            ? { ...p, status: "started", processId: data.processId }
            : p
        );
      });
    },
    onError: (err: unknown, variables) => {
      queryClient.setQueryData<ManagedProcessStatus[]>(["processes"], (old) => {
        if (!old) return old;
        return old.map((p) =>
          p.name === variables.name
            ? { ...p, status: "stopped", processId: null }
            : p
        );
      });
      let errMsg = "Failed to start process.";
      let details: string | undefined;

      if (err instanceof ApiError) {
        errMsg = err.message;
        if (err.data && typeof err.data === "object") {
          details = JSON.stringify(err.data);
        }
      } else if (err instanceof Error) {
        errMsg = err.message;
      }

      addNotification("error", errMsg, `Start Error (${variables.name})`, details);
    },
    onSettled: (_data, _error, variables) => {
      setPendingStartNames((prev) => {
        const next = new Set(prev);
        next.delete(variables.name);
        return next;
      });
    },
  });

  // Stop process mutation
  const stopMutation = useMutation({
    mutationFn: async (name: string) => {
      setPendingStopNames((prev) => new Set(prev).add(name));
      return await stopProcess(name);
    },
    onSuccess: (data) => {
      addNotification("success", `Stopped process '${data.name}'`, "Process Stopped");
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      setProcessToStop(null);
    },
    onError: (err: unknown, name) => {
      let errMsg = "Failed to stop process.";
      let details: string | undefined;

      if (err instanceof ApiError) {
        errMsg = err.message;
        if (err.data && typeof err.data === "object") {
          details = JSON.stringify(err.data);
        }
      } else if (err instanceof Error) {
        errMsg = err.message;
      }

      addNotification("error", errMsg, `Stop Error (${name})`, details);
    },
    onSettled: (_data, _error, name) => {
      setPendingStopNames((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    },
  });

  const handleConfirmStop = () => {
    if (processToStop) {
      stopMutation.mutate(processToStop.name);
    }
  };

  const handleStart = (name: string, env: string) => {
    setSelectedLogsProcessName(name);
    startMutation.mutate({ name, env });
  };

  const handleCloseLogsModal = async () => {
    setSelectedLogsProcessName(null);
    await queryClient.invalidateQueries({ queryKey: ["processes"] });
    refetch();
  };

  const selectedLogsProcess = processes.find((p) => p.name === selectedLogsProcessName) || (
    selectedLogsProcessName
      ? {
          name: selectedLogsProcessName,
          workingDirectory: "",
          status: "started",
          processId: null,
          port: null,
          env: globalEnv,
          appUrl: null,
        }
      : null
  );

  // Filter processes
  const filteredProcesses = processes.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.workingDirectory.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.port && p.port.toString().includes(searchQuery));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "running" && p.status === "running") ||
      (statusFilter === "stopped" && p.status === "stopped");

    return matchesSearch && matchesStatus;
  });

  const runningCount = processes.filter((p) => p.status === "running").length;
  const stoppedCount = processes.filter((p) => p.status === "stopped").length;

  // Multi-selection stats
  const selectedCount = filteredProcesses.filter((p) => selectedNames.has(p.name)).length;
  const isAllSelected = filteredProcesses.length > 0 && selectedCount === filteredProcesses.length;
  const isSomeSelected = selectedCount > 0 && !isAllSelected;

  const selectedRunningCount = filteredProcesses.filter(
    (p) => selectedNames.has(p.name) && (p.status === "running" || p.status === "started")
  ).length;

  const selectedStoppedCount = filteredProcesses.filter(
    (p) => selectedNames.has(p.name) && p.status === "stopped"
  ).length;

  // Multi-select handlers
  const handleToggleSelect = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedNames(new Set());
    } else {
      const allFilteredNames = filteredProcesses.map((p) => p.name);
      setSelectedNames(new Set(allFilteredNames));
    }
  };

  const handleClearSelection = () => {
    setSelectedNames(new Set());
  };

  // Bulk Operations
  const handleBulkStart = async () => {
    const targetProcesses = filteredProcesses.filter(
      (p) => selectedNames.has(p.name) && p.status === "stopped"
    );

    if (targetProcesses.length === 0) return;

    setIsBulkStarting(true);
    const envToUse = bulkEnv || globalEnv || "local";

    const results = await Promise.allSettled(
      targetProcesses.map((p) => startProcess(p.name, envToUse))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (succeeded > 0) {
      addNotification(
        "success",
        `Successfully started ${succeeded} process(es) with '${envToUse}' profile.`,
        "Bulk Start Completed"
      );
    }
    if (failed > 0) {
      addNotification(
        "error",
        `Failed to start ${failed} process(es). Check process logs or backend settings.`,
        "Bulk Start Errors"
      );
    }

    await queryClient.invalidateQueries({ queryKey: ["processes"] });
    setIsBulkStarting(false);
  };

  const handleBulkStopTrigger = () => {
    const targets = filteredProcesses.filter(
      (p) => selectedNames.has(p.name) && (p.status === "running" || p.status === "started")
    );
    if (targets.length === 0) return;
    setBulkStopTargets(targets);
  };

  const handleConfirmBulkStop = async () => {
    if (bulkStopTargets.length === 0) return;

    setIsBulkStopping(true);
    const results = await Promise.allSettled(bulkStopTargets.map((p) => stopProcess(p.name)));

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (succeeded > 0) {
      addNotification(
        "success",
        `Successfully stopped ${succeeded} process(es).`,
        "Bulk Stop Completed"
      );
    }
    if (failed > 0) {
      addNotification(
        "error",
        `Failed to stop ${failed} process(es).`,
        "Bulk Stop Errors"
      );
    }

    setBulkStopTargets([]);
    await queryClient.invalidateQueries({ queryKey: ["processes"] });
    setIsBulkStopping(false);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification Banner */}
      <NotificationBanner notifications={notifications} onDismiss={handleDismissNotification} />

      {/* Single Process Stop Confirmation Modal */}
      <StopConfirmModal
        process={processToStop}
        isOpen={Boolean(processToStop)}
        isPending={stopMutation.isPending}
        onConfirm={handleConfirmStop}
        onCancel={() => setProcessToStop(null)}
      />

      {/* Bulk Stop Confirmation Modal */}
      <StopConfirmModal
        processes={bulkStopTargets}
        isOpen={bulkStopTargets.length > 0}
        isPending={isBulkStopping}
        onConfirm={handleConfirmBulkStop}
        onCancel={() => setBulkStopTargets([])}
      />

      {/* Process Logs Streaming Modal */}
      <ProcessLogsModal
        process={selectedLogsProcess}
        isOpen={Boolean(selectedLogsProcess)}
        onClose={handleCloseLogsModal}
        isAuthenticated={isAuthenticated}
        onOpenSettings={onOpenSettings}
      />

      {/* Control Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter processes by name, directory, or port..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded bg-slate-200 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 p-1 rounded-lg shrink-0">
            <span className="text-[11px] text-slate-500 font-semibold px-2 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Filter:
            </span>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All ({processes.length})
            </button>
            <button
              onClick={() => setStatusFilter("running")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                statusFilter === "running"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Radio className="w-3 h-3 text-emerald-600" />
              Running ({runningCount})
            </button>
            <button
              onClick={() => setStatusFilter("stopped")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                statusFilter === "stopped"
                  ? "bg-slate-200 text-slate-800 border border-slate-300"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Square className="w-3 h-3 text-slate-500 fill-slate-500" />
              Stopped ({stoppedCount})
            </button>
          </div>

          {/* Default Environment selection control */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">
            <Compass className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <label htmlFor="global-env-select" className="text-xs font-bold text-slate-600 font-mono">
              Default profile:
            </label>
            <select
              id="global-env-select"
              value={globalEnv}
              onChange={(e) => {
                setGlobalEnv(e.target.value);
                setBulkEnv(e.target.value);
              }}
              className="bg-transparent text-xs font-mono font-bold text-indigo-700 focus:outline-none cursor-pointer"
            >
              <option value="local">local</option>
              <option value="dev">dev</option>
              <option value="staging">staging</option>
              <option value="production">production</option>
            </select>
          </div>
        </div>

        {/* Operational Stats Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Total Configured: <strong className="text-slate-900 font-mono">{processes.length}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Running: <strong className="font-mono">{runningCount}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Stopped: <strong className="font-mono">{stoppedCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching || !isAuthenticated}
              className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 transition-colors font-medium disabled:opacity-50"
              title="Refresh process list"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isFetching ? "animate-spin" : ""}`} />
              <span>{isFetching ? "Refreshing..." : "Refresh Status"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid & State Views */}

      {/* 1. Unauthenticated State */}
      {!isAuthenticated && (
        <div className="bg-white border border-amber-200 rounded-xl p-8 text-center space-y-4 shadow-xs">
          <div className="inline-flex p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-600">
            <KeyRound className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Authentication Required</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              To discover and manage backend processes, please provide your OAuth Client ID and Client Secret in Settings, or enable Sample Mock API Data mode.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleEnableMockMode}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore with Sample Mock Data</span>
            </button>
            <button
              onClick={() => setIsLoginOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 transition-colors"
            >
              <KeyRound className="w-4 h-4 text-slate-600" />
              <span>Open Settings & Credentials</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Loading State */}
      {isAuthenticated && isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 animate-pulse shadow-xs">
              <div className="flex justify-between items-center">
                <div className="h-5 bg-slate-200 rounded w-1/2"></div>
                <div className="h-5 bg-slate-200 rounded-full w-20"></div>
              </div>
              <div className="space-y-2 py-2">
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-2/3"></div>
              </div>
              <div className="h-9 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Error State */}
      {isAuthenticated && !isLoading && isError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-4 shadow-xs">
          <div className="inline-flex p-3 bg-rose-100 border border-rose-200 rounded-xl text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">Failed to Fetch Process List</h3>
            <p className="text-xs text-rose-700">
              {error instanceof Error ? error.message : "Network error or API unreachable."}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Retry Request</span>
            </button>
            <button
              onClick={handleEnableMockMode}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Use Sample Mock Data</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-300 shadow-2xs transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Check Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Empty State */}
      {isAuthenticated && !isLoading && !isError && filteredProcesses.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3 shadow-xs">
          <div className="inline-flex p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {processes.length === 0 ? "No Configured Processes Found" : "No Matching Processes"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {processes.length === 0
              ? "The backend process manager returned an empty list of processes (`GET /api/processes`). Ensure your backend configuration declares managed services."
              : `No processes match query '${searchQuery}' with status filter '${statusFilter}'.`}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg border border-slate-300 font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* 5. Process Display Area with Bulk Toolbar */}
      {isAuthenticated && !isLoading && !isError && filteredProcesses.length > 0 && (
        <div className="space-y-4">
          {/* Bulk Operations Toolbar */}
          <BulkToolbar
            selectedCount={selectedCount}
            totalCount={filteredProcesses.length}
            selectedRunningCount={selectedRunningCount}
            selectedStoppedCount={selectedStoppedCount}
            isAllSelected={isAllSelected}
            isSomeSelected={isSomeSelected}
            bulkEnv={bulkEnv}
            onBulkEnvChange={setBulkEnv}
            onToggleSelectAll={handleToggleSelectAll}
            onClearSelection={handleClearSelection}
            onBulkStart={handleBulkStart}
            onBulkStop={handleBulkStopTrigger}
            isBulkStarting={isBulkStarting}
            isBulkStopping={isBulkStopping}
            isAuthenticated={isAuthenticated}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Table View OR Grid Card View */}
          {viewMode === "table" ? (
            <ProcessTable
              processes={filteredProcesses}
              selectedNames={selectedNames}
              globalEnv={globalEnv}
              pendingStartNames={pendingStartNames}
              pendingStopNames={pendingStopNames}
              isAuthenticated={isAuthenticated}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              isAllSelected={isAllSelected}
              isSomeSelected={isSomeSelected}
              onStart={handleStart}
              onRequestStop={(p) => setProcessToStop(p)}
              onViewLogs={(p) => setSelectedLogsProcessName(p.name)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredProcesses.map((proc) => (
                <ProcessCard
                  key={proc.name}
                  process={proc}
                  globalEnv={globalEnv}
                  isStarting={pendingStartNames.has(proc.name)}
                  isStopping={pendingStopNames.has(proc.name)}
                  isAuthenticated={isAuthenticated}
                  isSelected={selectedNames.has(proc.name)}
                  onToggleSelect={handleToggleSelect}
                  onStart={handleStart}
                  onRequestStop={(p) => setProcessToStop(p)}
                  onViewLogs={(p) => setSelectedLogsProcessName(p.name)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

