import { ManagedProcessLog } from "../types";
import { AuthError, clearStoredToken, ensureValidToken } from "./auth";
import { ApiError, getApiBaseUrl, notifyAuthError } from "./api";
import { generateMockLogStream, isMockModeEnabled } from "./mockData";

export interface StreamManagedProcessLogsOptions {
  processName: string;
  sinceMinutes?: number;
  onConnect?: () => void;
  onLog: (log: ManagedProcessLog) => void;
  onError: (error: Error) => void;
  onClose: () => void;
  signal: AbortSignal;
}

/**
 * Streams live SSE process logs from the backend process manager.
 * 
 * - URL-encodes the process name
 * - Builds sinceMinutes with URLSearchParams
 * - Uses centralized bearer-token authentication flow
 * - Accepts an AbortSignal to manage stream lifecycle
 * - Incrementally parses SSE frames, ignoring comments and keep-alives
 * - Dispatches event: log frames at blank-line boundaries
 * - Surfaces malformed payloads and non-2xx responses as stream errors
 */
export async function streamManagedProcessLogs(
  options: StreamManagedProcessLogsOptions
): Promise<void>;
export async function streamManagedProcessLogs(
  processName: string,
  onLog: (log: ManagedProcessLog) => void,
  onError: (error: Error) => void,
  onClose: () => void,
  signal: AbortSignal,
  sinceMinutes?: number,
  onConnect?: () => void
): Promise<void>;
export async function streamManagedProcessLogs(
  arg1: string | StreamManagedProcessLogsOptions,
  arg2?: ((log: ManagedProcessLog) => void) | unknown,
  arg3?: ((error: Error) => void) | unknown,
  arg4?: (() => void) | unknown,
  arg5?: AbortSignal | unknown,
  arg6?: number,
  arg7?: () => void
): Promise<void> {
  let processName: string;
  let sinceMinutes: number | undefined;
  let onConnect: (() => void) | undefined;
  let onLog: (log: ManagedProcessLog) => void;
  let onError: (error: Error) => void;
  let onClose: () => void;
  let signal: AbortSignal;

  if (typeof arg1 === "object" && arg1 !== null) {
    const opts = arg1 as StreamManagedProcessLogsOptions;
    processName = opts.processName;
    sinceMinutes = opts.sinceMinutes;
    onConnect = opts.onConnect;
    onLog = opts.onLog;
    onError = opts.onError;
    onClose = opts.onClose;
    signal = opts.signal;
  } else {
    processName = arg1 as string;
    onLog = arg2 as (log: ManagedProcessLog) => void;
    onError = arg3 as (error: Error) => void;
    onClose = arg4 as () => void;
    signal = arg5 as AbortSignal;
    sinceMinutes = arg6;
    onConnect = arg7;
  }

  // Handle Mock Mode
  if (isMockModeEnabled()) {
    generateMockLogStream(processName, sinceMinutes, onConnect, onLog, onError, onClose, signal);
    return;
  }

  const baseUrl = getApiBaseUrl();

  // Obtain authorization token using centralized auth flow
  let token: string;
  try {
    token = await ensureValidToken(baseUrl);
  } catch (err) {
    const authErr = err instanceof AuthError ? err : new AuthError(String(err));
    notifyAuthError(authErr);
    onError(authErr);
    return;
  }

  // 1. URL-encode the process name
  const encodedName = encodeURIComponent(processName);

  // 2. Build sinceMinutes query parameter using URLSearchParams
  const searchParams = new URLSearchParams();
  if (typeof sinceMinutes === "number" && !isNaN(sinceMinutes)) {
    searchParams.set("sinceMinutes", String(sinceMinutes));
  }
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const endpointPath = `/api/processes/${encodedName}/logs${queryString}`;
  const url = `${baseUrl}${endpointPath}`;

  const executeFetchStream = async (authToken: string, isRetry = false): Promise<void> => {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${authToken}`,
        },
        signal,
      });
    } catch (netErr) {
      if (signal.aborted) return;
      throw new ApiError(
        `Network stream connection failed: ${netErr instanceof Error ? netErr.message : String(netErr)}`
      );
    }

    // Handle 401 Unauthorized
    if (response.status === 401) {
      clearStoredToken();
      if (!isRetry) {
        try {
          const newToken = await ensureValidToken(baseUrl);
          return await executeFetchStream(newToken, true);
        } catch (retryErr) {
          const authErr =
            retryErr instanceof AuthError
              ? retryErr
              : new AuthError("Session expired (401). Please re-authenticate.", "UNAUTHORIZED");
          notifyAuthError(authErr);
          throw authErr;
        }
      } else {
        const authErr = new AuthError("Unauthorized access (401) for logs stream.", "UNAUTHORIZED");
        notifyAuthError(authErr);
        throw authErr;
      }
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      clearStoredToken();
      const authErr = new AuthError(
        "Access forbidden (403) for logs stream. Please verify client permissions.",
        "FORBIDDEN"
      );
      notifyAuthError(authErr);
      throw authErr;
    }

    // Surface non-2xx HTTP response status as stream error
    if (!response.ok) {
      let errorMsg = `Logs stream request failed with status ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && typeof errJson === "object") {
          if (typeof errJson.error === "string") {
            errorMsg = errJson.error;
          } else if (typeof errJson.message === "string") {
            errorMsg = errJson.message;
          }
        }
      } catch {
        // Non-JSON response body
      }
      throw new ApiError(errorMsg, response.status);
    }

    if (!response.body) {
      throw new ApiError("No readable stream response body available.");
    }

    // Response headers received and status is 2xx: stream is connected!
    onConnect?.();

    // Incremental SSE Reader & Parser
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let currentEventType = "message"; // default SSE event type
    let currentDataLines: string[] = [];

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trimEnd();

          // Blank-line boundary: dispatch accumulated event frame
          if (line === "") {
            if (currentDataLines.length > 0) {
              // Dispatch event: log frames (or default message frames)
              if (currentEventType === "log" || currentEventType === "message") {
                const dataStr = currentDataLines.join("\n");
                try {
                  const parsed = JSON.parse(dataStr);
                  if (
                    parsed &&
                    typeof parsed === "object" &&
                    typeof parsed.timestamp === "string" &&
                    (parsed.stream === "stdout" || parsed.stream === "stderr") &&
                    typeof parsed.message === "string"
                  ) {
                    onLog(parsed as ManagedProcessLog);
                  } else {
                    // Surface malformed payload schema as visible stream error
                    onError(
                      new Error("Malformed SSE log payload: object missing required timestamp, stream, or message fields.")
                    );
                  }
                } catch (jsonErr) {
                  // Surface malformed JSON syntax as visible stream error
                  onError(
                    new Error(
                      `Malformed SSE JSON payload: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`
                    )
                  );
                }
              }
            }
            // Reset frame state after boundary
            currentEventType = "message";
            currentDataLines = [];
          } else if (line.startsWith(":")) {
            // Ignore SSE comment and keep-alive lines (e.g. ": keep-alive", ": ping", ":")
            continue;
          } else if (line.startsWith("event:")) {
            currentEventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            currentDataLines.push(line.slice(5).trimStart());
          }
        }
      }

      // Flush remaining data in buffer if present upon stream completion
      if (buffer.trimEnd() !== "") {
        const line = buffer.trimEnd();
        if (line.startsWith("data:")) {
          const dataStr = line.slice(5).trimStart();
          try {
            const parsed = JSON.parse(dataStr);
            if (
              parsed &&
              typeof parsed === "object" &&
              typeof parsed.timestamp === "string" &&
              (parsed.stream === "stdout" || parsed.stream === "stderr") &&
              typeof parsed.message === "string"
            ) {
              onLog(parsed as ManagedProcessLog);
            } else {
              onError(new Error("Malformed SSE log payload at stream end."));
            }
          } catch {
            onError(new Error("Malformed SSE JSON payload at stream end."));
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    onClose();
  };

  try {
    await executeFetchStream(token);
  } catch (err: unknown) {
    if (signal.aborted) {
      onClose();
      return;
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
