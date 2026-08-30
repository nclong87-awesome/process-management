import { ClientCredentials, OAuthTokenResponse, StoredAuthToken } from "../types";

const AUTH_STORAGE_KEY = "process-management.auth";

// Sensitive credentials strictly held in React/JS memory only.
let inMemoryCredentials: ClientCredentials | null = null;

// Deduplicate concurrent token refresh requests
let inFlightTokenPromise: Promise<StoredAuthToken> | null = null;

export class AuthError extends Error {
  public code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export function setMemoryCredentials(credentials: ClientCredentials | null): void {
  inMemoryCredentials = credentials;
}

export function getMemoryCredentials(): ClientCredentials | null {
  return inMemoryCredentials;
}

export function getStoredToken(): StoredAuthToken | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthToken;
    if (parsed && typeof parsed.accessToken === "string" && typeof parsed.expiresAt === "number") {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn("Failed to parse stored auth token:", err);
    return null;
  }
}

export function saveStoredToken(token: StoredAuthToken): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(token));
  } catch (err) {
    console.error("Failed to save auth token to localStorage:", err);
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear auth token from localStorage:", err);
  }
}

export function isTokenValid(token: StoredAuthToken | null, safetyWindowMs = 60000): boolean {
  if (!token || !token.accessToken) return false;
  return token.expiresAt - Date.now() > safetyWindowMs;
}

/**
 * Fetches a new OAuth bearer token using client credentials flow.
 */
export async function fetchOAuthToken(
  clientId: string,
  clientSecret: string,
  baseUrl: string
): Promise<StoredAuthToken> {
  const tokenUrl = `${baseUrl.replace(/\/+$/, "")}/oauth/token`;

  const bodyParams = new URLSearchParams();
  bodyParams.append("grant_type", "client_credentials");
  bodyParams.append("client_id", clientId);
  bodyParams.append("client_secret", clientSecret);

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });
  } catch (netErr) {
    throw new AuthError(`Network error while authenticating at ${tokenUrl}`);
  }

  if (!response.ok) {
    let errorMsg = `Authentication failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && typeof errJson.error === "string") {
        errorMsg = errJson.error;
      } else if (errJson && typeof errJson.error_description === "string") {
        errorMsg = errJson.error_description;
      }
    } catch {
      // Ignore JSON parse error on non-OK response
    }
    throw new AuthError(errorMsg, `HTTP_${response.status}`);
  }

  const data = (await response.json()) as OAuthTokenResponse;

  if (!data.access_token) {
    throw new AuthError("OAuth endpoint returned no access_token");
  }

  const expiresMs = (data.expires_in || 3600) * 1000;
  const storedToken: StoredAuthToken = {
    accessToken: data.access_token,
    tokenType: "Bearer",
    expiresAt: Date.now() + expiresMs,
  };

  saveStoredToken(storedToken);
  return storedToken;
}

/**
 * Ensures we have a valid bearer token. Handles automatic refresh using in-memory credentials,
 * deduplicating concurrent in-flight requests.
 */
export async function ensureValidToken(baseUrl: string): Promise<string> {
  const existingToken = getStoredToken();

  if (isTokenValid(existingToken)) {
    return existingToken!.accessToken;
  }

  // Token is expired or missing. Check if we have client credentials in memory.
  const creds = getMemoryCredentials();
  if (!creds || !creds.clientId || !creds.clientSecret) {
    if (existingToken && existingToken.expiresAt > Date.now()) {
      // Still strictly unexpired, even if inside safety window
      return existingToken.accessToken;
    }
    clearStoredToken();
    throw new AuthError("Session expired or invalid. Please log in with Client ID and Client Secret.", "NO_CREDENTIALS");
  }

  // Deduplicate in-flight token requests
  if (inFlightTokenPromise) {
    const token = await inFlightTokenPromise;
    return token.accessToken;
  }

  try {
    inFlightTokenPromise = fetchOAuthToken(creds.clientId, creds.clientSecret, baseUrl);
    const newToken = await inFlightTokenPromise;
    return newToken.accessToken;
  } finally {
    inFlightTokenPromise = null;
  }
}
