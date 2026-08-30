# Process Manager

A web dashboard for discovering, starting, monitoring, and stopping configured backend processes.

## Features

- **Real Backend Process Control**: Interacts directly with the backend API (`GET /api/processes`, `POST /api/processes/{name}/start`, `POST /api/processes/{name}/stop`).
- **OAuth Client Credentials Authentication**: Supports runtime OAuth authentication (`POST /oauth/token`). Client secrets are strictly held in React memory (RAM) for browser security.
- **TanStack Query Integration**: Automatic server-state caching, invalidation, and pending mutation progress feedback.
- **Accessible State Displays**: Running and stopped states are visually distinct using custom status badges, icons, animated indicators, and high contrast typography.
- **Environment Targeting**: Per-process and global start-environment selectors (`env=local`, `dev`, `staging`, `production`).
- **Stop Confirmation**: Safe confirmation modal before stopping running services.

## Environment Setup

Create a `.env` file or use `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5204
```

## Installation & Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Lint code & type-check:
   ```bash
   npm run lint
   ```
