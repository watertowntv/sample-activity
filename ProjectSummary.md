# Project Summary: Discord Activity Template Framework (Exhaustive Edition)

This document is the definitive technical manual for the Discord Activity Template. It provides a granular, line-by-line analysis of the framework's internal architecture, reactive persistence, socket engine, and asset optimization. It is designed to be the only reference needed to understand, maintain, and extend the system.

---

## Table of Contents
1.  **Core Philosophy & Architecture**
2.  **Server Persistence: Deep Proxy & Atomic I/O**
3.  **Socket Engine: Handshake & Lifecycle**
4.  **Client Orchestration: Auth & State Mirroring**
5.  **Asset Engine: Preloading & Audio Pooling**
6.  **Communication Protocol & Type Safety**
7.  **End-to-End Logic Flow**
8.  **Extension & Scaling Guide**

---

## I. Core Philosophy & Architecture

The framework is built as a **High-Reliability State Mirroring System**. Unlike simple request-response apps, this template maintains a persistent, synchronized connection between the server (the Authoritative Source of Truth) and all connected clients (Reactive Mirrors).

### Key Architectural Pillars:
- **Zero-Trust Communication**: Every packet is validated via Zod schemas.
- **Reactive Persistence**: State changes automatically trigger throttled disk writes.
- **Resilient Handshaking**: Robust handling of network flickers and page refreshes via 30-second grace periods.
- **Monorepo Synergy**: Unified types across shared/client/server using pnpm workspaces.

---

## II. Deep Dive Part 1: Server-Side Reactive Persistence Layer

The server persistence layer, located in `server/src/internal/core/config.ts`, is a sophisticated reactive system built on ES6 Proxies. It provides transparent data persistence with high performance and crash resilience.

### 1. The `useServerConfig` System
`useServerConfig<T>(type, id, initialConfig, autoSave)` is the primary entry point for managing persistent state.

#### Singleton Instance Management
The system ensures that for any given `type:id` pair, only one instance of the config exists in memory.
```typescript
const key = `${type}:${safeId}`;
if (instances.has(key)) return instances.get(key) as T & ServerIO;
```
This prevents race conditions where two different parts of the code might be modifying two different objects representing the same data.

#### Recursive Deep Proxy (The `wrap` Function)
The core of the reactivity is the `wrap` function. It recursively applies a Proxy to every object and sub-object within the configuration.

**The Get Trap:**
When you access a property:
- If it's a special Symbol (`IS_PROXY`), it returns `true`.
- If it's `RAW`, it returns the underlying non-proxied object.
- If it's `$save`, it returns the persistence function.
- If the value is an object, it calls `wrap(value)` before returning it.

**The Set Trap:**
When you modify a property:
- It intercepts the assignment.
- **Deep Cloning**: To prevent external reference leakage, if you assign an object, it is cloned: `JSON.parse(JSON.stringify(rawValue))`.
- **Reactivity**: If `autoSave` is true, it automatically calls `io.$save()`.

**The `WeakMap` Proxy Cache:**
To ensure that `proxyA.sub === proxyA.sub` (referential integrity), the system uses a `WeakMap<object, unknown>`.
```typescript
if (proxyCache.has(target)) return proxyCache.get(target) as U;
// ... create proxy ...
proxyCache.set(target, proxy);
```
This prevents "Proxy Bloat" where accessing the same nested object multiple times would create new Proxy instances.

### 2. Atomic Write and I/O Throttling
Disk I/O is the most expensive operation. This system implements a multi-stage protection layer.

#### Throttling Logic (`io.$save`)
The `$save` method does not write to disk immediately.
1.  **Debouncing**: It checks `saveTimeouts`. If one is active, it returns immediately.
2.  **Delay**: It sets a 1000ms timer (`APP_CONSTANTS.CONFIG_SAVE_DELAY`).
3.  **Concurrency Control**:
    - `activeWrites`: A Set of keys currently being written.
    - `pendingSaves`: A Set of keys that changed while a write was in progress.

**Flow of a Save Cycle:**
- Mutation -> `$save()` -> `setTimeout(1000ms)`.
- Timeout expires -> `activeWrites.add(key)`.
- `fs.writeFile` to `.tmp` file.
- On Success -> `fs.rename` to final `.json`.
- On Finish -> `activeWrites.delete(key)`.
- If `pendingSaves` has the key -> trigger `$save()` again immediately to sync the latest changes.

#### Atomic rename Pattern
The use of `fs.rename` is critical. In Node.js (and most OSs), `rename` is atomic.
- **Problem**: If the server crashes during `fs.writeFile`, the file might be half-written and corrupted.
- **Solution**: We write to `data.json.tmp`. Once the write is confirmed successful, we rename it to `data.json`. The filesystem ensures that `data.json` is either the old version or the completely new version. It is never corrupted.

### 3. Crash Recovery & Cleanup
#### Startup Sanitization
Upon server boot, the system scans the `db/` directory and deletes any `.tmp` files.
```typescript
if (f.endsWith('.tmp')) {
    const fullPath = path.join(typeDir, f);
    try { if (fs.statSync(fullPath).isFile()) fs.unlinkSync(fullPath); } catch {}
}
```
This cleans up any partial writes that occurred before a previous crash.

#### Flush on Exit (`flushAllConfigs`)
The server intercepts `SIGINT` and `SIGTERM`. It then iterates through every active config and performs a **synchronous** write to ensure all in-memory changes are committed before the process dies.

---

## III. Deep Dive Part 2: Socket Engine & Lifecycle Management

The socket engine, located in `server/src/internal/core/socketManager.ts`, is the central nervous system of the application. It handles authentication, security, and the relationship between users and activity instances.

### 1. Connection Security & Origin Validation
The `verifyClient` callback is the first line of defense.
#### Domain Whitelisting
It extracts the hostname from the `Origin` header and checks it against three categories:
- **Local**: `localhost` or `127.0.0.1`.
- **Discord**: `*.discord.com` or `*.discordsays.com`.
- **Custom**: Domains listed in the `ALLOWED_ORIGINS` environment variable.

#### Host Matching
As a fallback, if the `origin` hostname matches the `host` header hostname, the connection is allowed. This is vital for deployments behind reverse proxies where the origin and host might be identical (e.g., a custom domain).

### 2. Authentication Handshake (The `AUTH` Flow)
A connection is not usable until it passes the `AUTH` phase.
#### The Grace Period (`authTimeout`)
Every new connection is assigned a 30-second `authTimeout`.
```typescript
const authTimeout = setTimeout(() => { if (!ws.isAuthenticated) ws.terminate(); }, APP_CONSTANTS.AUTH_GRACE_PERIOD);
```
If the client fails to send a valid `AUTH` message within this window, the server terminates the socket to prevent "hanging" unauthenticated connections from consuming resources.

#### The `AUTH` Message Payload
The client sends:
- `code`: The Discord OAuth2 authorization code.
- `instanceId`: The unique ID of the current Discord Activity instance.

#### Server-Side Verification
1.  **Token Exchange**: The server calls `requestDiscordToken(code)`.
2.  **User Fetch**: It then calls `requestDiscordUser(accessToken)` to get the user's ID and avatar.
3.  **Promotion**: If both succeed, `ws.isAuthenticated` is set to `true`, and the `authTimeout` is cleared.

### 3. Session and Instance Mapping
The server maintains complex Maps to track who is where.
- **`userSessions`**: `Map<UserId, Set<WebSocket>>`. One user can have multiple tabs open. The server tracks all of them.
- **`instanceSessions`**: `Map<InstanceId, Set<WebSocket>>`. All users in a specific activity instance are grouped here.

#### Importance of Mapping
This mapping allows for:
- **Targeted Messaging**: Sending a message to a specific user across all their devices.
- **Instance Broadcasting**: Sending a message to everyone "in the same room".
- **Cleanup Logic**: Knowing exactly when the last person has left an instance.

### 4. Graceful Session Cleanup
The framework uses a "Delayed Cleanup" pattern to handle network instability and page refreshes.
#### The 30-Second Grace Period (`cleanupTimeouts`)
When the **last** socket for a `UserId` or `InstanceId` closes:
1.  The session is not deleted immediately.
2.  A 30-second `cleanupTimeout` (`INSTANCE_CLEANUP_DELAY`) is started.
3.  The ID is added to the `cleanupTimeouts` Map.

#### Reconnection Logic
If a user reconnects within that 30-second window:
1.  The server detects the existing `cleanupTimeout`.
2.  It calls `clearTimeout()` and removes it from the Map.
3.  The user's in-memory configuration (`useServerConfig`) is preserved and reused.

#### Final Disposal
If the timer expires, `unloadServerConfig` is called. This:
- Flushes the final state to disk.
- Removes the config object from the `instances` Map in `config.ts`.
- Purges the memory.

### 5. Heartbeat and Rate Limiting
#### Ping/Pong Mechanism
Every 30 seconds, the server iterates through all clients:
1.  It sets `ws.isAlive = false`.
2.  It sends a `ws.ping()`.
3.  When the browser responds with a `pong`, the `ws.on('pong', ...)` listener sets `ws.isAlive = true`.
4.  If a socket is still `isAlive === false` on the next cycle, it is terminated.

#### Rate Limiting
The server protects itself from "spammy" clients:
```typescript
if (now - ws.lastResetTime < 1000) {
    ws.messageCount++;
    if (ws.messageCount > APP_CONSTANTS.WS_MESSAGE_RATE_LIMIT) return; // Silent drop
}
```
This limits each socket to 10 messages per second, preventing a single compromised or buggy client from overwhelming the server.

---

## IV. Deep Dive Part 3: Client Layer - Session Orchestration

The client layer is designed for high resilience, ensuring that the user remains "in the experience" even during network drops.

### 1. Resilient Socket Hook (`client/src/internal/hooks/useSocket.ts`)
The `useSocket` hook is a production-grade wrapper for the native `WebSocket` API.

#### Exponential Backoff Reconnection
Instead of hammering the server with immediate reconnection attempts, the hook uses an exponential backoff:
```typescript
const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
```
- **Attempt 1**: 1s
- **Attempt 2**: 2s
- **Attempt 3**: 4s
- **Attempt 4**: 8s
- **Attempt 5+**: 10s (capped)

#### Runtime Type Safety (Zod Integration)
Every message received from the server is parsed and validated before it reaches the component:
```typescript
const json = JSON.parse(event.data);
const result = GlobalSocketMessageSchema.safeParse(json);
if (result.success) onMessageRef.current?.(result.data as T, send);
```

### 2. Session Orchestrator (`client/src/internal/context/DiscordProvider.tsx`)
The `DiscordProvider` manages the high-level state of the application.

#### Authorization Grace Period (`authResetRef`)
Just as the server has grace periods, the client does too.
If the socket disconnects:
1.  A 30-second `authResetRef` timer starts.
2.  If the socket reconnects within 30s, the timer is cleared, and `isAuthorized` remains `true`.

#### Handshake Flow (Client Side)
1.  **Mount**: SDK ready check.
2.  **Socket Open**: Trigger `performAuth`.
3.  **Discord Authorize**: Call `sdk.commands.authorize` to get the `code`.
4.  **Send AUTH**: Send the `code` and `instanceId` to the server.
5.  **Receive INIT**:
    - Set `user` profile.
    - Set `isAuthorized = true`.
    - **SDK Authenticate**: Use the `accessToken` from the server to call `sdk.commands.authenticate`.
    - **Subscribe**: Subscribe to `ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE`.

### 3. Persistent Client State (`client/src/internal/hooks/useConfig.ts`)
The client uses Zustand for global state, but with a custom persistence and merging engine.

#### The `merge` Utility
The framework provides a deep-merge function that carefully merges objects but replaces arrays.

#### Store Subscription & LocalStorage
Every time the Zustand store changes:
```typescript
useConfig.subscribe((state) => {
    const { patch, ...data } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
});
```

#### The `patch` Pattern
To maintain immutability and trigger React re-renders, the `patch` method uses a "Clone-Modify-Return" pattern:
```typescript
patch: (config) => set((state) => {
    const next = JSON.parse(JSON.stringify(state)); // Deep clone
    return merge(next, config); // Mutate clone and return
})
```

---

## V. Deep Dive Part 4: Asset Engine - Preloading & Audio Pooling

The asset engine is optimized for the constrained environment of the Discord client, focusing on memory efficiency and low-latency feedback.

### 1. Strategic Preloading (`client/src/internal/hooks/useAssetLoader.ts`)
The `useAssetLoader` hook ensures the application is fully ready before the first pixel is drawn.

#### Dual-Path Loading
The hook splits loading logic based on file extension:
- **Images**: Created via `new Image()`, using the `.onload` event.
- **Audio**: Created via `new Audio()`, using the `.oncanplay` event.

#### Progress Calculation
The hook tracks `loadedCount` and `totalCount` to provide a 0-100 `progress` value.

### 2. High-Performance Audio Pooling (`client/src/internal/hooks/useSound.ts`)
The framework solves memory leaks and stuttering with a **Global Audio Pool**.

#### The Pool Architecture
The pool is a static array: `const pool: HTMLAudioElement[] = [];`.

#### Request Logic (The Search)
When `play()` is called:
1.  **Exact Match**: Search the pool for an element that is `paused` AND has the same `src`.
2.  **Expansion**: If no match and `pool.length < MAX_SOUND_POOL_SIZE` (40), create a `new Audio()`.
3.  **Hijacking**: If the pool is full, find ANY `paused` element. Change its `src` and reuse it.

#### Playback Lifecycle
- **Volume**: The `masterVolume` from `useConfig` is applied just before `.play()`.
- **Pre-loading**: If a hijacked element has a new `src`, we call `.load()` and wait for the `oncanplaythrough` event before calling `.play()`.

---

## VI. Protocol & Type Safety (`shared/`)

The `shared/` folder is the glue that binds the monorepo together.

### 1. Zod Discriminated Unions
The communication protocol is defined as a discriminated union of objects.
```typescript
export const GlobalSocketMessageSchema = z.discriminatedUnion("type", [...]);
```
- **Validation**: `safeParse` returns a typed result.
- **Exhaustiveness**: Using a `switch` on `message.type` allows TypeScript to narrow the `payload` type perfectly.

### 2. Monorepo Synchronization
Because both `client` and `server` import from the same `shared` workspace package, it is **physically impossible** for the client to send a message that the server doesn't understand, or vice versa, at compile time.

---

## VII. End-to-End Flow: A State Update

The lifecycle of a single state change:
1.  **User Action**: Player clicks "Join".
2.  **Client Message**: `send({ type: MessageType.CLIENT_MESSAGE, payload: { name: 'Alice' } })`.
3.  **Server Receive**: `socketManager.ts` validates via Zod.
4.  **Logic Execution**: `MainLogic.ts` is called.
5.  **State Mutation**: `config.count += 1`.
6.  **Proxy Detection**: The Proxy trap in `config.ts` triggers `$save()`.
7.  **Throttled Write**: After 1000ms, the server writes to `.tmp` and renames.
8.  **Broadcast**: Server sends `SERVER_MESSAGE` to all clients in the instance.
9.  **Client Receive**: `MainHandler.ts` receives the message.
10. **Store Update**: `updateConfig({ count: payload.count })` is called.
11. **UI Refresh**: React re-renders the counter component.
12. **LocalStorage**: The new count is saved to the browser's disk.

---

## VIII. Extension & Scaling Guide

### 1. Adding New Persistent State
- Define the interface in `shared/types/index.ts`.
- Add a default object in `server/src/config.ts`.
- Access it via `useServerConfig`.

### 2. Adding New Audio/Visual Assets
- Place files in `client/public`.
- Define keys in `client/src/assets/sounds.ts` or `images.ts`.
- Use `useSound('KEY').play()` in components.

### 3. Creating New Game Messages
- Add the schema to `shared/message/client/` or `shared/message/server/`.
- Export from `shared/message/index.ts`.
- Update `MainLogic.ts` (server) and `MainHandler.ts` (client).

---

*Verified & Synchronized: April 29, 2026*
