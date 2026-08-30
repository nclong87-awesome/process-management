import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { StoredAuthToken } from "../types";
import {
  clearStoredToken,
  fetchOAuthToken,
  getMemoryCredentials,
  getStoredToken,
  isTokenValid,
  setMemoryCredentials,
} from "../lib/auth";
import { getApiBaseUrl, onAuthError } from "../lib/api";

interface AuthContextType {
  token: StoredAuthToken | null;
  isAuthenticated: boolean;
  hasMemoryCredentials: boolean;
  authError: string | null;
  isLoginOpen: boolean;
  setIsLoginOpen: (open: boolean) => void;
  login: (clientId: string, clientSecret: string) => Promise<void>;
  logout: () => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<StoredAuthToken | null>(() => getStoredToken());
  const [hasMemoryCredentials, setHasMemoryCredentials] = useState<boolean>(() => Boolean(getMemoryCredentials()));
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(() => {
    const initialToken = getStoredToken();
    return !isTokenValid(initialToken, 0);
  });

  const isAuthenticated = Boolean(token && isTokenValid(token, 0));

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setMemoryCredentials(null);
    setToken(null);
    setHasMemoryCredentials(false);
    setAuthError(null);
    setIsLoginOpen(true);
  }, []);

  const login = useCallback(async (clientId: string, clientSecret: string) => {
    setAuthError(null);
    const cleanId = clientId.trim();
    const cleanSecret = clientSecret.trim();

    if (!cleanId || !cleanSecret) {
      throw new Error("Client ID and Client Secret are required.");
    }

    // Save sensitive secret strictly in memory
    setMemoryCredentials({ clientId: cleanId, clientSecret: cleanSecret });
    setHasMemoryCredentials(true);

    try {
      const baseUrl = getApiBaseUrl();
      const newToken = await fetchOAuthToken(cleanId, cleanSecret, baseUrl);
      setToken(newToken);
      setIsLoginOpen(false);
    } catch (err) {
      setMemoryCredentials(null);
      setHasMemoryCredentials(false);
      const msg = err instanceof Error ? err.message : "Failed to authenticate";
      setAuthError(msg);
      throw err;
    }
  }, []);

  // Listen to background API auth errors (e.g., 401, 403)
  useEffect(() => {
    const unsubscribe = onAuthError((err) => {
      const currentToken = getStoredToken();
      setToken(currentToken);
      setAuthError(err.message || "Authentication error occurred");
      setIsLoginOpen(true);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        hasMemoryCredentials,
        authError,
        isLoginOpen,
        setIsLoginOpen,
        login,
        logout,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
