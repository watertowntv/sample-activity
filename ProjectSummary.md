# SYSTEM ARCHITECTURE & CODE CONTRACT SPECIFICATION (LLM REFERENCE)

This file contains the complete, token-efficient system architecture, codebase layout, and data models of the Discord Activity Template project. It is structured to allow an LLM agent to accurately understand the contracts, interfaces, and state logic of the application without loading individual files.

---

## 1. Directory Tree & Package Mappings
The workspace is configured as a `pnpm` monorepo defined in [pnpm-workspace.yaml](file:///D:/js/sample-activity/pnpm-workspace.yaml).

```
D:\js\sample-activity
├── package.json (Monorepo root config)
├── pnpm-workspace.yaml (Declares packages: client, server, shared)
├── tsconfig.json (Base typescript configurations)
├── shared/ (Common data validation and contracts)
│   ├── package.json
│   ├── tsconfig.json
│   ├── constants.ts (System runtime constants)
│   ├── types/
│   │   ├── discord.ts (Discord models/schemas)
│   │   └── index.ts (Entrypoint exporting types, schemas, constants)
│   └── message/
│       ├── index.ts (Main schema union definition)
│       ├── infrastructure.ts (AUTH, INIT, ERROR message models)
│       ├── client/
│       │   └── index.ts (Client-initiated models)
│       └── server/
│           └── index.ts (Server-initiated models)
├── server/ (NodeJS Express + WS backend service)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── server.ts (App bootstrap, middleware, lifecycle events)
│   │   ├── config/
│   │   │   ├── index.ts (Server global settings models)
│   │   │   └── history.ts (History record schema definitions)
│   │   ├── db/
│   │   │   └── static/
│   │   │       └── global.json (Disk serialized configuration state)
│   │   ├── logic/
│   │   │   └── MainLogic.ts (Core state mutation and client broadcasting logic)
│   │   ├── utils/
│   │   │   └── utils.ts (Session mapping helpers)
│   │   └── internal/
│   │       ├── types/
│   │       │   └── index.ts (Server typings, ActivityWebSocket interface)
│   │       ├── core/
│   │       │   ├── config.ts (Proxy-based debounced atomic config manager)
│   │       │   └── socketManager.ts (WS listener, rate limiting, OAuth exchange)
│   │       └── services/
│   │           └── discordService.ts (Discord OAuth API client)
└── client/ (React + Zustand + Tailwind CSS frontend application)
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx (React root loader, Error Boundary, Context mounting)
        ├── App.tsx (Initial state checking, suspenses main view, handles loader)
        ├── index.css
        ├── App.css
        ├── assets/
        │   ├── images.ts (Image maps)
        │   ├── sounds.ts (Sound maps)
        │   └── index.ts (Combined loader list)
        ├── config/
        │   ├── index.ts (Client settings schemas)
        │   └── scene.ts (Scene Enum definitions)
        ├── handler/
        │   └── MainHandler.ts (WS message dispatcher)
        ├── utils/
        │   └── utils.ts (Utility functions: avatar mapping, platform checks)
        ├── scenes/
        │   ├── MainScene.tsx (Zustand-controlled scene router)
        │   └── CountScene.tsx (Click counter, user details & participant list)
        └── internal/
            ├── components/
            │   └── ErrorBoundary.tsx (Standard React error boundaries)
            ├── context/
            │   ├── DiscordContext.ts (Typings for Discord Context API)
            │   └── DiscordProvider.tsx (Auth hook runner, SDK wrapper, socket listener)
            ├── lib/
            │   └── discord.ts (DiscordSDK singleton instantiator)
            ├── scenes/
            │   ├── ErrorScene.tsx (Static fallback for errors)
            │   └── LoadingScene.tsx (Progress tracking splash screen)
            └── hooks/
                ├── useSocket.ts (WS hook with exponential backoff)
                ├── useConfig.ts (Zustand client cache with localStorage backup)
                ├── useSound.ts (In-memory sound pool manager)
                └── useAssetLoader.ts (Resource loaders using standard HTML tags)
```

---

## 2. API Contracts & Data Schemas (`shared/`)

### 2.1 Constants (`shared/constants.ts`)
```typescript
export const APP_CONSTANTS = {
    AUTH_GRACE_PERIOD: 30000,       // Max time (ms) to authorize socket before termination
    WS_PING_INTERVAL: 30000,        // Heartbeat interval (ms)
    WS_MAX_PAYLOAD: 65536,          // Size limit (bytes) for safety
    WS_MESSAGE_RATE_LIMIT: 10,      // Max messages accepted per 1 second window
    MAX_SOUND_POOL_SIZE: 40,        // Client side maximum HTMLAudioElement objects cache
    SOUND_POOL_EXPIRY: 60000,       // Lifespan (ms) of cached sound elements
    CONFIG_SAVE_DELAY: 1000,        // Debounce buffer (ms) for file persistence writes
    INSTANCE_CLEANUP_DELAY: 30000,  // Cache retention buffer (ms) on close before garbage collection
    SERVER_PORT: 3030               // Port for http/ws server bindings
} as const;
```
Declared in: [shared/constants.ts](file:///D:/js/sample-activity/shared/constants.ts)

### 2.2 Models & Types (`shared/types/discord.ts`)
```typescript
import { z } from "zod";
export const DiscordUserSchema = z.object({
    id: z.string(),
    username: z.string(),
    global_name: z.string().nullable(),
    avatar: z.string().nullable(),
    discriminator: z.string()
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
Declared in: [shared/types/discord.ts](file:///D:/js/sample-activity/shared/types/discord.ts)

### 2.3 Network Communication Protocol (`shared/message/`)
All WS communication must conform to [GlobalSocketMessageSchema](file:///D:/js/sample-activity/shared/message/index.ts#L24) which is a `z.discriminatedUnion("type")` aggregating schemas from infra, client, and server namespaces.

#### Infrastructure Messages (`shared/message/infrastructure.ts`)
- **`AUTH`**: Emitted from client to start authentication.
  - Payload: `{ code: string, instanceId: string }`
- **`INIT`**: Sent by server upon successful authorization.
  - Payload: `{ user: DiscordUser, accessToken: string }`
- **`ERROR`**: Server message when auth/logic fails.
  - Payload: `{ message: string }`

#### Client messages (`shared/message/client/index.ts`)
- **`CLIENT_CONNECTION`**: Signals that a client has authenticated and is ready for state synchronization.
  - Payload: `{}`
- **`CLIENT_MESSAGE`**: Dispatched on user interaction.
  - Payload: `{ name: string }`

#### Server messages (`shared/message/server/index.ts`)
- **`SERVER_MESSAGE`**: Authoritative game state sync event.
  - Payload: `{ count: number }`

---

## 3. Server Logic & Internal Operations (`server/`)

### 3.1 Network / Server Setup (`server/src/server.ts`)
- **Bootstrap**: Boots Express and HTTP server. Binds the WS handler to the HTTP instance.
- **CSP & Security**: Instantiates `helmet` configuring `frame-ancestors` directive values:
  `["'self'", "https://discord.com", "https://*.discord.com", "https://*.discordsays.com"]`.
- **Proxy Filter**: Implements intercept middleware rejecting connections that include `x-forwarded-for` or `cf-connecting-ip` headers if the `User-Agent` string does not contain `'Discord'`.
- **Cleanup Handlers**: Traps `SIGINT` and `SIGTERM` process events to block execution, flushes active RAM caches using `flushAllConfigs()`, and shuts down.

### 3.2 WebSocket Session Manager (`server/src/internal/core/socketManager.ts`)
Handles network lifecycles, authentication routines, rate limiting, and heartbeats.
- **Origin Check**: Verifies matching domains during `verifyClient` handshake: allows `localhost`, `127.0.0.1`, `*.discord.com`, `*.discordsays.com` and custom entries matched in `process.env.ALLOWED_ORIGINS` (comma-separated list).
- **Socket Interfaces**: Extends the `WebSocket` base prototype into [ActivityWebSocket](file:///D:/js/sample-activity/server/src/internal/types/index.ts#L5-L16) to attach connection metadata:
  ```typescript
  export interface ActivityWebSocket extends WebSocket {
      instanceId: string | null;
      sessionId?: string | null;
      userId?: string;
      username?: string;
      isAuthenticated?: boolean;
      isAlive?: boolean;
      messageCount?: number;
      lastResetTime?: number;
      sendJSON(data: GlobalSocketMessage): void;
  }
  ```
- **Ratelimiting**: Monitors message counts per connection: inside a sliding 1-second window, any socket sending more than `APP_CONSTANTS.WS_MESSAGE_RATE_LIMIT` (10 messages) triggers dropping updates (rate limit violations do not close the socket).
- **Auth Handshake & Token Fetch**:
  1. Blocks incoming traffic until an `AUTH` packet is validated. If no `AUTH` packet is received within 30s (`APP_CONSTANTS.AUTH_GRACE_PERIOD`), the connection is terminated.
  2. If client environment matches non-production dev config and code is `'browser'`, builds a mock user session profile: `{ id: 'browser', username: 'browser', global_name: 'browser', avatar: null, discriminator: '0000' }`.
  3. Otherwise, requests credentials from Discord OAuth2 API endpoint (`https://discord.com/api/oauth2/token`) using [requestDiscordToken](file:///D:/js/sample-activity/server/src/internal/services/discordService.ts#L14-L38), and fetches user profile details from `@me` endpoints (`https://discord.com/api/users/@me`) via [requestDiscordUser](file:///D:/js/sample-activity/server/src/internal/services/discordService.ts#L40-L47).
  4. Stores session mappings: inserts client socket reference to global mapping tables (`userSessions`, `instanceSessions`). Cancels active cleanup schedules for the corresponding IDs.
  5. Dispatches an `INIT` type message.
- **Cleanup Scheduling**:
  When a socket connection closes, the socket is removed from connection maps.
  If the `userSessions` or `instanceSessions` maps become empty (size 0), a timeout handler is created:
  ```typescript
  const timeout = setTimeout(() => {
      unloadServerConfig(type, id);
      cleanupTimeouts.delete(key);
  }, APP_CONSTANTS.INSTANCE_CLEANUP_DELAY); // 30 seconds
  ```
  This retains session settings in memory to permit client reconnects without writing/loading files repetitively.

### 3.3 Dynamic Proxy Persistence Engine (`server/src/internal/core/config.ts`)
Manages asynchronous, debounced, crash-safe state caching using ES6 proxies.

#### `useServerConfig<T>(type: ConfigType, id: string, initialConfig: T, autoSave: boolean): T & ServerIO`
- **Instantiation**: If config maps contain `${type}:${id}`, returns cached reference. Otherwise, reads file `server/db/${type}/${id}.json`. If absent, parses `initialConfig`.
- **Property Mutation Interception**: Creates an ES6 `Proxy` wrapper:
  - **`get` Interceptor**: Automatically returns child objects wrapped recursively in a Proxy. Returns raw data if accessing `Symbol(raw)` or the saving wrapper when referencing `Symbol(is_proxy)` / `$save`.
  - **`set` / `deleteProperty` Interceptors**: Intercepts edits. Copies mutated values to targets. If `autoSave === true`, queues a disk save by calling `io.$save()`.
- **Debounced Save Routine**:
  1. Checks if a write is scheduled or active. If active, registers a flag in `pendingSaves` and returns.
  2. Creates a deferred timeout utilizing `APP_CONSTANTS.CONFIG_SAVE_DELAY` (1 second).
  3. **Atomic File Write Logic**:
     - Serializes the state configuration object to JSON.
     - Asynchronously writes payload to `filePath.tmp` using `fs.writeFile`.
     - Upon completion, calls `fs.rename` to replace the main `filePath` with the temporary file. This ensures that if the system crashes mid-write, the database file is not corrupted.
     - Checks the `pendingSaves` array: if modifications occurred during the save operation, a new save cycle is immediately queued.
- **Flushing and Unloading**:
  - `flushAllConfigs()`: Triggers synchronous file writes (`fs.writeFileSync` -> `fs.renameSync`) for all configurations in memory. Executed on server shutdown.
  - `unloadServerConfig()`: Saves changes and removes the configuration from the active registry. Called when sessions time out.

### 3.4 Authoritative Server State & Main Logic (`server/src/logic/MainLogic.ts`)
- **State Schema**:
  ```typescript
  export const GlobalServerConfigSchema = z.object({
      count: z.number().default(0),
      history: z.array(z.object({
          user: z.string(),
          at: z.number()
      })).default([])
  });
  ```
  Persistent state file: [server/src/db/static/global.json](file:///D:/js/sample-activity/server/src/db/static/global.json)
- **Logic Runner**: Coordinates client updates:
  ```typescript
  export function MainLogic(io: WebSocketServer, socket: ActivityWebSocket, _instanceId: string, message: GlobalSocketMessage): void {
      const config = useServerConfig<GlobalServerConfig>('static', 'global', INITIAL_GLOBAL_CONFIG, true);
      switch (message.type) {
          case MessageType.CLIENT_CONNECTION:
              // State Sync: returns current counter to the single request socket
              socket.sendJSON({ type: MessageType.SERVER_MESSAGE, payload: { count: config.count } });
              break;
          case MessageType.CLIENT_MESSAGE:
              // Interaction Event: increment counter, push log, keep history size <= 5
              config.count += 1;
              config.history.push({ user: message.payload.name, at: Date.now() });
              if (config.history.length > 5) config.history.shift();
              
              // Broadcast updated state to all connected WS clients
              const serverMessage = { type: MessageType.SERVER_MESSAGE, payload: { count: config.count } };
              [...io.clients].filter(c => c.readyState === 1).forEach(c => c.sendJSON(serverMessage));
              break;
      }
  }
  ```

---

## 4. Client Logic & Rendering Engine (`client/`)

### 4.1 Local State Store (`client/src/internal/hooks/useConfig.ts`)
- **Zustand Model**: Uses Zustand to manage client preferences.
  ```typescript
  export const ClientConfigSchema = z.object({
      scene: z.enum(['Count']).default('Count'),
      count: z.number().default(0),
      volume: z.object({ master: z.number().default(1) }).default({ master: 1 })
  });
  ```
- **Sync**: Stores configuration in `localStorage` under `app_config`. Any updates to the store are written back automatically via `useConfig.subscribe()`.

### 4.2 Discord Embedded Integration (`client/src/internal/context/DiscordProvider.tsx`)
Binds the Discord Embedded App SDK to the application lifecycle.
- **SDK Loading**:
  1. Instantiates `DiscordSDK` if `window.location.search` includes `frame_id` or the user agent is `Discord`.
  2. If the SDK is missing, falls back to `'Browser'` mode and mocks a channel instance (`'browser-instance'`).
  3. Inside the SDK, calls `discordSdk.ready()` and reads `discordSdk.instanceId`.
- **Handshake Flow**:
  1. Connects the websocket using `useSocket`.
  2. Once connected, triggers the auth process:
     - Browser mode: Sends an `AUTH` message with code `'browser'`.
     - Discord mode: Calls `discordSdk.commands.authorize` to retrieve an OAuth code, sending it to the server in an `AUTH` message.
  3. When an `INIT` message is received, calls `discordSdk.commands.authenticate` with the access token.
  4. Subscribes to `'ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE'` and queries connected users via `getInstanceConnectedParticipants` to display user indicators.
  5. If the WebSocket connection drops, it waits 30 seconds (`APP_CONSTANTS.AUTH_GRACE_PERIOD`) before clearing authorization flags to avoid UI flicker during temporary reconnections.

### 4.3 WebSocket Bridge Hook (`client/src/internal/hooks/useSocket.ts`)
```typescript
export const useSocket = <T>(url: string, onMessage?: (data: T, send: (data: T) => void) => void) => {
    // 1. Manages instantiations, open, close, and error callbacks.
    // 2. Parsed messages are validated against GlobalSocketMessageSchema before invoking onMessage callbacks.
    // 3. Implements exponential backoff: reconnect delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000).
    // 4. Closes connections cleanly with exit code 1000 on unmount.
}
```

### 4.4 Media Utilities & Optimization Hooks
- **Sound Pool Hook (`client/src/internal/hooks/useSound.ts`)**:
  - Implements static sound pooling to reduce browser overhead:
    ```typescript
    const pool: HTMLAudioElement[] = [];
    ```
  - When playing audio, queries the cache for a paused `Audio` element with a matching source.
  - If no paused audio element is found:
    - If the pool size is below `MAX_SOUND_POOL_SIZE` (40), instantiates a new `Audio` element and registers it in the cache.
    - Otherwise, overrides a paused audio element currently in the pool.
  - Sets the volume to the current master volume configuration (`useConfig(s => s.volume.master)`) and plays the track.
- **Asset Loader Hook (`client/src/internal/hooks/useAssetLoader.ts`)**:
  - Iterates over assets array containing:
    ```typescript
    export const SOUNDS = { PING: '/ping.mp3' } as const;
    export const IMAGES = { FAVICON: '/favicon.png' } as const;
    ```
  - Resolves asset types matching file extensions.
  - Preloads elements using `new Image()` or `new Audio()`.
  - Sets onload/onerror listener properties and updates progress variables to let `App.tsx` know when it's safe to load components.

### 4.5 UI Structure & Routing
- **Entrypoint**: `main.tsx` mounts the application tree:
  `StrictMode` -> `ErrorBoundary` -> `DiscordProvider` -> `App`.
- **Asset/Auth Guard**: [client/src/App.tsx](file:///D:/js/sample-activity/client/src/App.tsx) reads status values:
  - If SDK or loading error occurs: mounts [ErrorScene](file:///D:/js/sample-activity/client/src/internal/scenes/ErrorScene.tsx).
  - If authentication is still loading: mounts [LoadingScene](file:///D:/js/sample-activity/client/src/internal/scenes/LoadingScene.tsx).
  - When ready: lazily renders [MainScene](file:///D:/js/sample-activity/client/src/scenes/MainScene.tsx).
  - Displays a "Reconnecting..." badge if `!isConnected && isAuthorized` is true.
- **Scene Router**: `MainScene.tsx` queries local state preferences (`useConfigKey('scene')`) and lazily displays the corresponding component.
- **Interactive Component**: [CountScene.tsx](file:///D:/js/sample-activity/client/src/scenes/CountScene.tsx):
  - Displays the user avatar, name, and current count state.
  - Clicking the button plays `/ping.mp3` via `useSound` and sends a `CLIENT_MESSAGE` message to the server.
  - Renders a list of current voice channel participant names.

---

## 5. System Execution Flows

### 5.1 Click Event State Mutation Flow
```
User clicks button in CountScene
  │
  ├──► Play local sound (useSound)
  │
  └──► Send CLIENT_MESSAGE { name } via WebSocket
         │
         ▼
       WS Server verifies message rate limit & Zod schema validation
         │
         ▼
       MainLogic processes message type
         │
         ├──► Increment config.count (+1)
         │      │
         │      ▼
         │    Proxy intercepts write
         │      │
         │      ▼
         │    autoSave triggers debounce (1000ms delay)
         │      │
         │      ▼
         │    fs.writeFile("global.json.tmp") -> fs.rename("global.json")
         │
         ├──► Push record to history array (max size 5)
         │
         └──► Send SERVER_MESSAGE { count: config.count } to all active connections
                │
                ▼
              Client WebSocket parse schema validation (useSocket)
                │
                ▼
              MainHandler catches SERVER_MESSAGE
                │
                ▼
              Zustand updates count state
                │
                ▼
              Zustand updates LocalStorage ("app_config")
                │
                ▼
              CountScene re-renders UI
```

### 5.2 Disconnect Cleanup Flow
```
Client WebSocket connection drops
  │
  ▼
Server catches connection close callback (socketManager)
  │
  ├──► Remove socket from userSessions & instanceSessions maps
  │
  └──► Are session sets empty (size === 0)?
         │
         ├──► NO: Do nothing (other users are still connected)
         │
         └──► YES: Start cleanups
                │
                ▼
              Start setTimeout(..., 30000ms)
                │
                ├──► Reconnect within 30s: Cancel timeout & keep config in memory
                │
                └──► No reconnect: unloadServerConfig(type, id)
                       │
                       ▼
                     Save configuration in memory to disk and unload config cache
```
