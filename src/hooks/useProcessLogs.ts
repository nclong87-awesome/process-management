import { useState, useEffect, useRef, useCallback } from "react";
import { ManagedProcessLog } from "../types";
import { streamManagedProcessLogs } from "../lib/processLogsApi";
import { ApiError } from "../lib/api";
import { AuthError } from "../lib/auth";

export type StreamStatus = "idle" | "connecting" | "live" | "ended" | "error";

export interface StreamErrorInfo {
  message: string;
  isAuthError: boolean;
  status?: number;
}

export interface UseProcessLogsReturn {
  sinceMinutes: number;
  setSinceMinutes: (minutes: number) => void;
  logs: ManagedProcessLog[];
  streamStatus: StreamStatus;
  streamError: StreamErrorInfo | null;
  reconnect: () => void;
  clearLogs: () => void;
  hasConnected: boolean;
}

export function useProcessLogs(
  processName: string | null,
  isOpen: boolean,
  isAuthenticated: boolean
): UseProcessLogsReturn {
  // Default history-window control to 10 minutes when opening log panel
  const [sinceMinutes, setSinceMinutesState] = useState<number>(10);
  const [logs, setLogs] = useState<ManagedProcessLog[]>([]);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [streamError, setStreamError] = useState<StreamErrorInfo | null>(null);
  const [hasConnected, setHasConnected] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    (name: string, minutes: number) => {
      // Abort previous stream before starting another request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      setStreamStatus("connecting");
      setStreamError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      streamManagedProcessLogs({
        processName: name,
        sinceMinutes: minutes,
        onConnect: () => {
          if (!controller.signal.aborted) {
            setStreamStatus("live");
            setHasConnected(true);
            setStreamError(null);
          }
        },
        onLog: (newLog) => {
          if (!controller.signal.aborted) {
            setLogs((prev) => [...prev, newLog]);
            setHasConnected(true);
            setStreamStatus("live");
          }
        },
        onError: (err) => {
          if (controller.signal.aborted) return;

          const isAuth =
            err instanceof AuthError ||
            (err instanceof ApiError && (err.status === 401 || err.status === 403));

          setStreamStatus("error");
          // On network failure, malformed SSE data, 401, or 403: keep existing entries visible and surface non-blocking error.
          // Do NOT retry in a tight loop.
          setStreamError({
            message: err.message || "Log stream connection error.",
            isAuthError: isAuth,
            status: err instanceof ApiError ? err.status : undefined,
          });
        },
        onClose: () => {
          if (!controller.signal.aborted) {
            setStreamStatus("ended");
          }
        },
        signal: controller.signal,
      });
    },
    []
  );

  // When log panel opens or process changes:
  // Default sinceMinutes to 10, clear logs, and start stream with sinceMinutes=10.
  useEffect(() => {
    if (!isOpen || !processName || !isAuthenticated) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setLogs([]);
      setStreamStatus("idle");
      setStreamError(null);
      setSinceMinutesState(10);
      setHasConnected(false);
      return;
    }

    // Always reset history window to default 10 minutes on modal open (do not persist user's previous selection)
    setSinceMinutesState(10);
    setLogs([]);
    setHasConnected(false);
    startStream(processName, 10);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [isOpen, processName, isAuthenticated, startStream]);

  // Handle user changing history window selector (e.g. from 10m to 30m)
  const setSinceMinutes = useCallback(
    (newMinutes: number) => {
      if (!processName) return;
      setSinceMinutesState(newMinutes);
      setLogs([]);
      setHasConnected(false);
      startStream(processName, newMinutes);
    },
    [processName, startStream]
  );

  // Reconnect stream manually
  const reconnect = useCallback(() => {
    if (!processName) return;
    startStream(processName, sinceMinutes);
  }, [processName, sinceMinutes, startStream]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    sinceMinutes,
    setSinceMinutes,
    logs,
    streamStatus,
    streamError,
    reconnect,
    clearLogs,
    hasConnected,
  };
}
