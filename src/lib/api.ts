import {
  AuthError,
  clearStoredToken,
  ensureValidToken,
  getMemoryCredentials,
  getStoredToken,
  isTokenValid,
} from "./auth";
import { ManagedProcessLog, ManagedProcessStatus, StartProcessResponse, StopProcessResponse } from "../types";
import {
  generateMockLogStream,
  getMockProcesses,
  isMockModeEnabled,
  mockStartProcess,
  mockStopProcess,
} from "./mockData";

export const getApiBaseUrl = (): string => {
  const metaEnv = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env;
  const envUrl = metaEnv?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return "http://localhost:5204";
};

export class ApiError extends Error {
  public status?: number;
  public data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// Global callback listener for unrecoverable 401/403 auth errors
type AuthErrorListener = (err: AuthError) => void;
const authErrorListeners: Set<AuthErrorListener> = new Set();

export function onAuthError(listener: AuthErrorListener): () => void {
  authErrorListeners.add(listener);
  return () => authErrorListeners.delete(listener);
}

function notifyAuthError(err: AuthError): void {
  authErrorListeners.forEach((listener) => listener(err));
}

/**
 * Checks if the client currently has a usable session (either valid token or memory credentials).
 */
export function hasUsableAuth(): boolean {
  if (isMockModeEnabled()) return true;
  const storedToken = getStoredToken();
  if (isTokenValid(storedToken, 0)) return true;
  const creds = getMemoryCredentials();
  return Boolean(creds && creds.clientId && creds.clientSecret);
}

/**
 * Executes an authenticated API request with automatic retry on 401.
 */
async function authenticatedRequest<T>(
  endpointPath: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const baseUrl = getApiBaseUrl();

  // Check if we can obtain a token
  let token: string;
  try {
    token = await ensureValidToken(baseUrl);
  } catch (err) {
    const authErr = err instanceof AuthError ? err : new AuthError(String(err));
    notifyAuthError(authErr);
    throw authErr;
  }

  const url = `${baseUrl}${endpointPath}`;
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr) {
    throw new ApiError(`Network request failed: ${netErr instanceof Error ? netErr.message : String(netErr)}`);
  }

  if (response.status === 401) {
    clearStoredToken();
    if (!isRetry) {
      // Attempt refresh & retry once
      try {
        return await authenticatedRequest<T>(endpointPath, options, true);
      } catch (retryErr) {
        const finalAuthErr =
          retryErr instanceof AuthError
            ? retryErr
            : new AuthError("Session expired or unauthorized. Please re-authenticate.", "UNAUTHORIZED");
        notifyAuthError(finalAuthErr);
        throw finalAuthErr;
      }
    } else {
      const authErr = new AuthError("Session unauthorized after retry. Please check credentials.", "UNAUTHORIZED");
      notifyAuthError(authErr);
      throw authErr;
    }
  }

  if (response.status === 403) {
    clearStoredToken();
    const authErr = new AuthError("Access forbidden (403). Please verify client credentials.", "FORBIDDEN");
    notifyAuthError(authErr);
    throw authErr;
  }

  // Parse JSON response body if present
  let responseData: unknown = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      // Ignore JSON parse error if body is empty or malformed
    }
  }

  if (!response.ok) {
    let errorMsg = `API request failed with status ${response.status}`;
    if (responseData && typeof responseData === "object" && responseData !== null) {
      const obj = responseData as Record<string, unknown>;
      if (typeof obj.error === "string") {
        errorMsg = obj.error;
      } else if (typeof obj.message === "string") {
        errorMsg = obj.message;
      }
    }
    throw new ApiError(errorMsg, response.status, responseData);
  }

  return responseData as T;
}

/**
 * GET /api/processes
 */
export async function fetchProcesses(): Promise<ManagedProcessStatus[]> {
  if (isMockModeEnabled()) {
    return getMockProcesses();
  }
  if (!hasUsableAuth()) {
    throw new AuthError("Authentication required. Please log in with Client ID and Client Secret in Settings.", "NO_AUTH");
  }
  return authenticatedRequest<ManagedProcessStatus[]>("/api/processes", {
    method: "GET",
  });
}

/**
 * POST /api/processes/{name}/start?env=local
 */
export async function startProcess(name: string, env = "local"): Promise<StartProcessResponse> {
  if (isMockModeEnabled()) {
    return mockStartProcess(name, env);
  }
  if (!hasUsableAuth()) {
    throw new AuthError("Authentication required. Please log in with Client ID and Client Secret in Settings.", "NO_AUTH");
  }

  const selectedEnv = env && env.trim() !== "" ? env.trim() : "local";
  const searchParams = new URLSearchParams({ env: selectedEnv });
  const encodedName = encodeURIComponent(name);
  const path = `/api/processes/${encodedName}/start?${searchParams.toString()}`;

  return authenticatedRequest<StartProcessResponse>(path, {
    method: "POST",
  });
}

/**
 * POST /api/processes/{name}/stop
 */
export async function stopProcess(name: string): Promise<StopProcessResponse> {
  if (isMockModeEnabled()) {
    return mockStopProcess(name);
  }
  if (!hasUsableAuth()) {
    throw new AuthError("Authentication required. Please log in with Client ID and Client Secret in Settings.", "NO_AUTH");
  }

  const encodedName = encodeURIComponent(name);
  const path = `/api/processes/${encodedName}/stop`;

  return authenticatedRequest<StopProcessResponse>(path, {
    method: "POST",
  });
}

/**
 * GET /api/processes/{name}/logs
 * Streams live SSE process logs using fetch & ReadableStream.
 */
export async function streamProcessLogs(
  name: string,
  onLog: (log: ManagedProcessLog) => void,
  onError: (error: Error) => void,
  onClose: () => void,
  signal: AbortSignal
): Promise<void> {
  if (isMockModeEnabled()) {
    generateMockLogStream(name, onLog, onError, onClose, signal);
    return;
  }

  const baseUrl = getApiBaseUrl();

  let token: string;
  try {
    token = await ensureValidToken(baseUrl);
  } catch (err) {
    const authErr = err instanceof AuthError ? err : new AuthError(String(err));
    notifyAuthError(authErr);
    onError(authErr);
    return;
  }

  const encodedName = encodeURIComponent(name);
  const url = `${baseUrl}/api/processes/${encodedName}/logs`;

  const fetchStream = async (authToken: string, isRetry = false): Promise<void> => {
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
      throw new ApiError(`Network request failed: ${netErr instanceof Error ? netErr.message : String(netErr)}`);
    }

    if (response.status === 401) {
      clearStoredToken();
      if (!isRetry) {
        try {
          const newToken = await ensureValidToken(baseUrl);
          return await fetchStream(newToken, true);
        } catch (retryErr) {
          const authErr = retryErr instanceof AuthError ? retryErr : new AuthError("Session expired", "UNAUTHORIZED");
          notifyAuthError(authErr);
          throw authErr;
        }
      } else {
        const authErr = new AuthError("Unauthorized for logs stream", "UNAUTHORIZED");
        notifyAuthError(authErr);
        throw authErr;
      }
    }

    if (response.status === 403) {
      clearStoredToken();
      const authErr = new AuthError("Access forbidden for logs stream (403)", "FORBIDDEN");
      notifyAuthError(authErr);
      throw authErr;
    }

    if (!response.ok) {
      let errorMsg = `Logs request failed with status ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && typeof errJson === "object" && typeof errJson.error === "string") {
          errorMsg = errJson.error;
        }
      } catch {
        // Response body was not JSON
      }
      throw new ApiError(errorMsg, response.status);
    }

    if (!response.body) {
      throw new ApiError("No response body available for log stream");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let currentEventType = "message";
    let currentDataLines: string[] = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trimEnd();

        if (trimmed === "") {
          if (currentDataLines.length > 0) {
            const dataStr = currentDataLines.join("\n");
            if (currentEventType === "log" || currentEventType === "message") {
              try {
                const logData = JSON.parse(dataStr) as ManagedProcessLog;
                if (logData && typeof logData.message === "string") {
                  onLog(logData);
                }
              } catch {
                // Ignore non-JSON payload
              }
            }
          }
          currentEventType = "message";
          currentDataLines = [];
        } else if (trimmed.startsWith(":")) {
          // Comment frame
        } else if (trimmed.startsWith("event:")) {
          currentEventType = trimmed.slice(6).trim();
        } else if (trimmed.startsWith("data:")) {
          currentDataLines.push(trimmed.slice(5).trimStart());
        }
      }
    }

    if (buffer.trimEnd() !== "") {
      const trimmed = buffer.trimEnd();
      if (trimmed.startsWith("data:")) {
        const dataStr = trimmed.slice(5).trimStart();
        try {
          const logData = JSON.parse(dataStr) as ManagedProcessLog;
          if (logData && typeof logData.message === "string") {
            onLog(logData);
          }
        } catch {}
      }
    }

    onClose();
  };

  try {
    await fetchStream(token);
  } catch (err: unknown) {
    if (signal.aborted) {
      onClose();
      return;
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
