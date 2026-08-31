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

export function notifyAuthError(err: AuthError): void {
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
 * POST /api/processes/{name}/start?launchProfile=local
 */
export async function startProcess(name: string, launchProfile = "local"): Promise<StartProcessResponse> {
  if (isMockModeEnabled()) {
    return mockStartProcess(name, launchProfile);
  }
  if (!hasUsableAuth()) {
    throw new AuthError("Authentication required. Please log in with Client ID and Client Secret in Settings.", "NO_AUTH");
  }

  const selectedLaunchProfile = launchProfile && launchProfile.trim() !== "" ? launchProfile.trim() : "local";
  const searchParams = new URLSearchParams({ launchProfile: selectedLaunchProfile });
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

export { streamManagedProcessLogs } from "./processLogsApi";

/**
 * Legacy wrapper forwarding to streamManagedProcessLogs
 */
export async function streamProcessLogs(
  name: string,
  onLog: (log: ManagedProcessLog) => void,
  onError: (error: Error) => void,
  onClose: () => void,
  signal: AbortSignal
): Promise<void> {
  const { streamManagedProcessLogs: streamFn } = await import("./processLogsApi");
  return streamFn({
    processName: name,
    onLog,
    onError,
    onClose,
    signal,
  });
}
