# SYSTEM ARCHITECTURE & CODE CONTRACT SPECIFICATION (LLM REFERENCE)

LLM Reference document specifying system contracts, monorepo layout, network protocols, state models, and execution flows for Discord Activity Template.

---

## 1. Directory Tree & Package Mappings

pnpm monorepo specified in `pnpm-workspace.yaml` (`client`, `server`, `shared`).

```
.
├── package.json (pnpm@10.33.0 root config)
├── pnpm-workspace.yaml (Packages: client, server, shared)
├── tsconfig.json (Base TS config)
├── .env.example (Env template)
├── shared/ (@activity/shared)
│   ├── package.json
│   ├── tsconfig.json
│   ├── constants.ts (APP_CONSTANTS)
│   ├── types/
│   │   ├── discord.ts (Discord User/Participant models)
│   │   └── index.ts (Unified shared export entrypoint)
│   └── message/
│       ├── index.ts (GlobalSocketMessageSchema union definition)
│       ├── infrastructure.ts (AUTH, INIT, ERROR schemas)
│       ├── client/index.ts (CLIENT_CONNECTION, CLIENT_MESSAGE)
│       └── server/index.ts (SERVER_MESSAGE)
├── server/ (@sample-activity/server)
│   ├── package.json (Express v5, WS v8, Zod v4, TSX)
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts (Express/WS server bootstrap & graceful shutdown)
│       ├── config/ (State models: global, history)
│       ├── db/static/global.json (Disk persistence storage)
│       ├── logic/MainLogic.ts (Authoritative state mutation & broadcast)
│       └── internal/
│           ├── types/index.ts (ActivityWebSocket interface)
│           ├── core/
│           │   ├── config.ts (Proxy-based atomic debounced state engine)
│           │   └── socketManager.ts (WS lifecycle, auth, rate limiting)
│           └── services/discordService.ts (Discord OAuth2 API client)
└── client/ (@sample-activity/client)
    ├── package.json (React v19, Vite v8, Zustand v5, Zod v4)
    ├── vite.config.ts (HMR disabled for OAuth rate limit prevention)
    ├── index.html
    └── src/
        ├── main.tsx (App bootstrap)
        ├── App.tsx (State router, scene suspense, reconnect overlay)
        ├── scenes/
        │   ├── MainScene.tsx (Zustand scene router)
        │   └── CountScene.tsx (Interactive click counter & participant list)
        ├── handler/MainHandler.ts (Client WS message handler)
        └── internal/
            ├── components/ErrorBoundary.tsx
            ├── context/
            │   ├── DiscordContext.ts
            │   └── DiscordProvider.tsx (SDK wrapper, OAuth handshake)
            ├── lib/discord.ts (DiscordSDK singleton)
            ├── scenes/ (ErrorScene.tsx, LoadingScene.tsx)
            └── hooks/
                ├── useSocket.ts (WS hook with exponential backoff)
                ├── useConfig.ts (Zustand local storage sync)
                ├── useSound.ts (Audio pool manager)
                └── useAssetLoader.ts (Image/Audio preloader)
```

---

## 2. API Contracts & Data Schemas (`shared`)

### 2.1 System Constants (`shared/constants.ts`)
```typescript
export const APP_CONSTANTS = {
    AUTH_GRACE_PERIOD: 30000,       // Max ms to authorize socket
    WS_PING_INTERVAL: 30000,        // Heartbeat interval
    WS_MAX_PAYLOAD: 65536,          // Payload size limit bytes
    WS_MESSAGE_RATE_LIMIT: 10,      // Max msgs per 1s window
    MAX_SOUND_POOL_SIZE: 40,        // Client audio element limit
    SOUND_POOL_EXPIRY: 60000,       // Sound cache TTL
    CONFIG_SAVE_DELAY: 1000,        // Debounce buffer for disk write
    INSTANCE_CLEANUP_DELAY: 30000,  // Session retention delay
    SERVER_PORT: 3030               // Default WS/HTTP port
} as const;
```

### 2.2 Domain Schemas (`shared/types/discord.ts`)
```typescript
import { z } from "zod";

export const DiscordUserSchema = z.object({
    id: z.string(),
    username: z.string(),
    global_name: z.string().nullable(),
    avatar: z.string().nullable(),
    discriminator: z.string().nullable().optional()
});
export type DiscordUser = z.infer<typeof DiscordUserSchema>;

export const ParticipantSchema = z.object({
    id: z.string(),
    username: z.string(),
    global_name: z.string().nullable().optional(),
    avatar: z.string().nullable().optional()
});
export type Participant = z.infer<typeof ParticipantSchema>;

export type AuthStatus = 'Initializing' | 'Ready' | 'Error' | 'Browser';
```

### 2.3 Socket Message Protocol (`shared/message/index.ts`)
Zod v4 `z.discriminatedUnion("type")` validating network payloads:
- **`AUTH`**: `{ code: string, instanceId: string }` (Client -> Server)
- **`INIT`**: `{ user: DiscordUser, accessToken: string }` (Server -> Client)
- **`ERROR`**: `{ message: string }` (Server -> Client)
- **`CLIENT_CONNECTION`**: `{}` (Client -> Server)
- **`CLIENT_MESSAGE`**: `{ name: string }` (Client -> Server)
- **`SERVER_MESSAGE`**: `{ count: number }` (Server -> Client)

---

## 3. Server Architecture (`server`)

### 3.1 Bootstrap & Security (`server/src/server.ts`)
- Express 5 + HTTP Server hosting WebSocket instance.
- Helmet CSP: `frame-ancestors: ["'self'", "https://discord.com", "https://*.discord.com", "https://*.discordsays.com"]`.
- Proxy Intercept: Blocks non-Discord User-Agent header when proxy headers (`x-forwarded-for`, `cf-connecting-ip`) are present.
- Shutdown: Traps `SIGINT`/`SIGTERM`, closes WS server (`wss.close()`), flushes RAM config proxies (`flushAllConfigs()`), exits clean (`process.exit(0)`).

### 3.2 Session & Auth Manager (`server/src/internal/core/socketManager.ts`)
- **Handshake Verification**: Verifies host/origin matching `localhost`, `127.0.0.1`, `*.discord.com`, `*.discordsays.com`, or `process.env.ALLOWED_ORIGINS`.
- **Socket Abstraction**: Extends `WebSocket` to `ActivityWebSocket` attaching `userId`, `username`, `instanceId`, `isAuthenticated`, `isAlive`, `messageCount`.
- **Rate Limiting**: Drops messages exceeding 10 msgs/sec sliding window.
- **Authentication**:
  1. Mandates `AUTH` frame within 30s (`AUTH_GRACE_PERIOD`) or terminates socket.
  2. Non-prod dev with `code === 'browser'` injects mock session `{ id: 'browser', username: 'browser' }`.
  3. Production exchanges `code` via Discord OAuth API (`/api/oauth2/token`) & user details (`/api/users/@me`).
  4. Maps socket to `userSessions` and `instanceSessions`. Sends `INIT` frame.
- **Session Cleanup**: Delayed 30s (`INSTANCE_CLEANUP_DELAY`) unload on socket close to survive quick reconnects without disk I/O churn.

### 3.3 State Persistence Engine (`server/src/internal/core/config.ts`)
- **Proxy Cache**: Wraps state objects in ES6 Proxy via `useServerConfig<T>()`. Uses `structuredClone()` for deep mutation target cloning.
- **Debounced Save**: Intercepts `set`/`deleteProperty` mutations. Queues 1s debounced write (`CONFIG_SAVE_DELAY`).
- **Atomic File IO**: Writes serialized JSON to `.tmp` file, executes `fs.rename` to prevent corrupt partial writes on crash.

### 3.4 State & Logic Execution (`server/src/logic/MainLogic.ts`)
- Authoritative state schema: `{ count: number, history: Array<{ user: string, at: number }> }`.
- `CLIENT_CONNECTION`: Returns current state snapshot (`SERVER_MESSAGE`).
- `CLIENT_MESSAGE`: Increments `count`, appends user history (max 5 records), broadcasts updated `SERVER_MESSAGE` to connected clients.

---

## 4. Client Architecture (`client`)

### 4.1 Local Config Store (`client/src/internal/hooks/useConfig.ts`)
- Zustand store holding `{ scene: 'Count', count: 0, volume: { master: 1 } }`.
- Subscribes store updates to `localStorage` key `app_config`.

### 4.2 Discord Embedded Integration (`client/src/internal/context/DiscordProvider.tsx`)
- Detects `frame_id` in query params or `Discord` user-agent. Instantiates `DiscordSDK`.
- Fallback: SDK absent -> mounts `Browser` mode (`instanceId: 'browser-instance'`).
- Auth Flow: `discordSdk.ready()` -> `authorize()` -> WS `AUTH` -> WS `INIT` -> `authenticate()` -> subscribe `ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE`.

### 4.3 Development Hot Reloading Guard (`client/vite.config.ts`)
- **Crucial**: Vite HMR disabled (`hmr: false`, `watch: { ignored: ['**/*'] }`).
- Prevents file save from triggering client re-mounts and firing rapid OAuth token requests, preventing Discord API 429 Rate Limit bans.

---

## 5. End-to-End Interaction Flow

```
User Click (CountScene)
  │
  ├──► Play local audio (useSound)
  └──► Send CLIENT_MESSAGE { name } via WebSocket
         │
         ▼
       Server WebSocket (socketManager): Rate limit (10/s) & Zod parse check
         │
         ▼
       MainLogic:
         ├──► Config mutation (Proxy set -> structuredClone -> debounced atomic write to disk)
         └──► Broadcast SERVER_MESSAGE { count } to connected clients
                │
                ▼
              Client WebSocket (useSocket): Validate Zod schema -> MainHandler
                │
                ▼
              Zustand store update -> LocalStorage sync -> UI re-render
```
