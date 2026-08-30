import { ManagedProcessLog, ManagedProcessStatus, StartProcessResponse, StopProcessResponse } from "../types";

const MOCK_MODE_KEY = "process-management.use-mock-api";
const MOCK_DATA_KEY = "process-management.mock-processes-data";

export const INITIAL_MOCK_PROCESSES: ManagedProcessStatus[] = [
  {
    name: "web-frontend",
    workingDirectory: "/var/www/web-frontend",
    env: "local",
    port: 3000,
    appUrl: "http://localhost:3000",
    status: "running",
    processId: 14205,
  },
  {
    name: "auth-service",
    workingDirectory: "/services/auth-api",
    env: "local",
    port: 5001,
    appUrl: "http://localhost:5001",
    status: "running",
    processId: 14212,
  },
  {
    name: "payment-gateway",
    workingDirectory: "/services/payment-v2",
    env: "dev",
    port: 5002,
    appUrl: null,
    status: "stopped",
    processId: null,
  },
  {
    name: "notification-worker",
    workingDirectory: "/workers/notifications",
    env: "staging",
    port: null,
    appUrl: null,
    status: "running",
    processId: 14230,
  },
  {
    name: "analytics-pipeline",
    workingDirectory: "/pipelines/analytics",
    env: "local",
    port: 8080,
    appUrl: null,
    status: "stopped",
    processId: null,
  },
  {
    name: "redis-cache-sync",
    workingDirectory: "/infrastructure/cache-sync",
    env: "production",
    port: 6379,
    appUrl: null,
    status: "running",
    processId: 14288,
  },
];

export function isMockModeEnabled(): boolean {
  try {
    const val = localStorage.getItem(MOCK_MODE_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export function setMockModeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(MOCK_MODE_KEY, String(enabled));
  } catch (err) {
    console.error("Failed to set mock mode:", err);
  }
}

export function getMockProcesses(): ManagedProcessStatus[] {
  try {
    const raw = localStorage.getItem(MOCK_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load mock processes from storage:", err);
  }
  saveMockProcesses(INITIAL_MOCK_PROCESSES);
  return INITIAL_MOCK_PROCESSES;
}

export function saveMockProcesses(processes: ManagedProcessStatus[]): void {
  try {
    localStorage.setItem(MOCK_DATA_KEY, JSON.stringify(processes));
  } catch (err) {
    console.error("Failed to save mock processes:", err);
  }
}

export function resetMockData(): ManagedProcessStatus[] {
  saveMockProcesses(INITIAL_MOCK_PROCESSES);
  return INITIAL_MOCK_PROCESSES;
}

export async function mockStartProcess(name: string, env = "local"): Promise<StartProcessResponse> {
  await new Promise((res) => setTimeout(res, 300));
  const processes = getMockProcesses();
  const existingIndex = processes.findIndex((p) => p.name === name);

  const randomPid = Math.floor(10000 + Math.random() * 89999);

  if (existingIndex >= 0) {
    const proc = { ...processes[existingIndex] };
    proc.status = "running";
    proc.env = env;
    proc.processId = randomPid;
    if (!proc.port && (name.includes("web") || name.includes("api") || name.includes("service"))) {
      proc.port = Math.floor(3000 + Math.random() * 5000);
      proc.appUrl = `http://localhost:${proc.port}`;
    }
    processes[existingIndex] = proc;
  } else {
    processes.push({
      name,
      workingDirectory: `/apps/${name}`,
      env,
      port: 8000,
      appUrl: `http://localhost:8000`,
      status: "running",
      processId: randomPid,
    });
  }

  saveMockProcesses(processes);
  return {
    name,
    status: "started",
    processId: randomPid,
  };
}

export async function mockStopProcess(name: string): Promise<StopProcessResponse> {
  await new Promise((res) => setTimeout(res, 250));
  const processes = getMockProcesses();
  const existingIndex = processes.findIndex((p) => p.name === name);

  if (existingIndex >= 0) {
    const proc = { ...processes[existingIndex] };
    proc.status = "stopped";
    proc.processId = null;
    processes[existingIndex] = proc;
    saveMockProcesses(processes);
  }

  return {
    name,
    status: "stopped",
  };
}

export function generateMockLogStream(
  name: string,
  onLog: (log: ManagedProcessLog) => void,
  _onError: (error: Error) => void,
  onClose: () => void,
  signal: AbortSignal
): void {
  let isClosed = false;

  const emit = (message: string, stream: "stdout" | "stderr" = "stdout") => {
    if (isClosed || signal.aborted) return;
    onLog({
      timestamp: new Date().toISOString(),
      stream,
      message,
    });
  };

  emit(`[MOCK MODE] Attached live log stream to process '${name}'`, "stdout");
  emit(`[INFO] Process ${name} initialized in local container sandbox`, "stdout");
  emit(`[INFO] Thread worker pool started with 4 threads`, "stdout");
  emit(`[DEBUG] Initializing event loop and database socket handlers...`, "stdout");

  const sampleMessages = [
    { msg: `GET /api/v1/healthcheck 200 OK - 2.1ms`, stream: "stdout" as const },
    { msg: `Database query execution [SELECT * FROM users] - 4.8ms`, stream: "stdout" as const },
    { msg: `[Worker] Background batch task sync completed successfully`, stream: "stdout" as const },
    { msg: `POST /api/v1/events 201 Created - 12.3ms`, stream: "stdout" as const },
    { msg: `[WARN] Garbage collector invoked: reclaimed 14.2 MB memory`, stream: "stderr" as const },
    { msg: `GET /api/v1/status 200 OK - 1.5ms`, stream: "stdout" as const },
    { msg: `[Redis] Subscribed to pub/sub channel 'process-events'`, stream: "stdout" as const },
    { msg: `Heartbeat ping sent to cluster node manager [STATUS OK]`, stream: "stdout" as const },
  ];

  let counter = 0;
  const interval = setInterval(() => {
    if (signal.aborted || isClosed) {
      clearInterval(interval);
      return;
    }
    const sample = sampleMessages[counter % sampleMessages.length];
    counter++;
    emit(sample.msg, sample.stream);
  }, 1800);

  const onAbort = () => {
    if (!isClosed) {
      isClosed = true;
      clearInterval(interval);
      onClose();
    }
  };

  if (signal.aborted) {
    onAbort();
  } else {
    signal.addEventListener("abort", onAbort, { once: true });
  }
}
