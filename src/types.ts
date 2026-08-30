export type ManagedProcessStatus = {
  name: string;
  workingDirectory: string;
  env: string;
  port: number | null;
  appUrl: string | null;
  status: "running" | "stopped";
  processId: number | null;
};

export type StoredAuthToken = {
  accessToken: string;
  tokenType: "Bearer";
  expiresAt: number; // Unix time in milliseconds
};

export type OAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export type StartProcessResponse = {
  name: string;
  status: "started";
  processId: number;
};

export type StopProcessResponse = {
  name: string;
  status: "stopped";
};

export type ApiErrorResponse = {
  error: string;
  processId?: number;
};

export type ClientCredentials = {
  clientId: string;
  clientSecret: string;
};
