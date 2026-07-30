# DEVELOPER EXTENSION & UTILITY API SPECIFICATION (LLM REFERENCE)

This document provides a token-efficient, comprehensive specification for developers and LLM agents extending the Discord Activity Template project. It details exact file modification pipelines, function signatures, utility parameters, and coding contracts.

---

## 1. Feature Extension Pipeline (Step-by-Step)

When adding a new feature or game mechanic (e.g., multiplayer card game, quiz, turn-based battle), execute modifications in the following sequential order:

```
[1. shared/] Define Data Schemas & Message Payloads
       │
       ▼
[2. server/] Implement Authoritative State & MainLogic Handlers
       │
       ▼
[3. client/] Register Dispatcher (MainHandler), Zustand Store, & React Scenes
       │
       ▼
[4. Debug]   Test via Browser Multi-Tab (http://localhost:3030)
```

---

### Step 1: Network Protocol & Data Contracts (`shared/`)

1. **Domain Data Models ([shared/types/](file:///d:/js/discord%20activity/sample-activity/shared/types/))**:
   - Create domain schema files (e.g., `shared/types/game.ts`).
   - Declare Zod schemas and export inferred TypeScript types.
   ```typescript
   import { z } from "zod";

   export const CardSchema = z.object({
       id: z.string(),
       value: z.number()
   });
   export type Card = z.infer<typeof CardSchema>;

   export const GameStateSchema = z.object({
       score: z.number().default(0),
       currentTurn: z.string().default('')
   });
   export type GameState = z.infer<typeof GameStateSchema>;
   ```

2. **Client-Initiated Messages ([shared/message/client/index.ts](file:///d:/js/discord%20activity/sample-activity/shared/message/client/index.ts))**:
   - Add new message action keys to `ClientMessageType`.
   - Append schema to `ClientMessagesSchema` array.
   ```typescript
   export const ClientMessageType = {
       CLIENT_CONNECTION: 'CLIENT_CONNECTION',
       CLIENT_MESSAGE: 'CLIENT_MESSAGE',
       PLAY_CARD: 'PLAY_CARD'
   } as const;

   export const ClientMessagesSchema = [
       // ...existing schemas
       z.object({
           type: z.literal(ClientMessageType.PLAY_CARD),
           payload: z.object({ cardId: z.string() })
       })
   ];
   ```

3. **Server-Initiated Messages ([shared/message/server/index.ts](file:///d:/js/discord%20activity/sample-activity/shared/message/server/index.ts))**:
   - Add new message action keys to `ServerMessageType`.
   - Append schema to `ServerMessagesSchema` array.
   ```typescript
   export const ServerMessageType = {
       SERVER_MESSAGE: 'SERVER_MESSAGE',
       GAME_SYNC: 'GAME_SYNC'
   } as const;

   export const ServerMessagesSchema = [
       // ...existing schemas
       z.object({
           type: z.literal(ServerMessageType.GAME_SYNC),
           payload: z.object({ score: z.number(), currentTurn: z.string() })
       })
   ];
   ```

4. **Schema Union Registration ([shared/message/index.ts](file:///d:/js/discord%20activity/sample-activity/shared/message/index.ts))**:
   - Explicitly register new Zod objects in `GlobalSocketMessageSchema` array.
   - **Do NOT automate with `Array.map`**; manual array registration guarantees TypeScript strict literal union type inference (`'PLAY_CARD' | 'GAME_SYNC'`) for full IDE autocomplete and switch-case type checking.

---

### Step 2: Authoritative Server State & Logic (`server/`)

1. **Initial State Definition ([server/src/config/](file:///d:/js/discord%20activity/sample-activity/server/src/config/))**:
   - Create initial state objects (e.g., `server/src/config/game.ts`).
   ```typescript
   export const INITIAL_GAME_STATE = { score: 0, currentTurn: '' };
   ```

2. **Server State Persistence (`useServerConfig`)**:
   - Access persistent state inside logic handlers using `useServerConfig`:
   ```typescript
   import { useServerConfig } from '../internal/core/config';

   // Signature: useServerConfig<T>(type: ConfigType, id: string, initialConfig: T, autoSave: boolean): T & ServerIO
   const roomConfig = useServerConfig('instance', instanceId, INITIAL_GAME_STATE, true);
   ```
   - Storage Type Behaviors:
     - `'instance'`: State scoped to Discord Voice Channel (`server/db/instance/${instanceId}.json`).
     - `'user'`: State scoped to Individual User (`server/db/user/${userId}.json`).
     - `'static'`: State scoped to Global Server (`server/db/static/${safeId}.json`).

3. **Logic Handler ([server/src/logic/MainLogic.ts](file:///d:/js/discord%20activity/sample-activity/server/src/logic/MainLogic.ts))**:
   - Add switch-case handlers for incoming client messages.
   - Mutate `roomConfig` properties directly (ES6 Proxy intercepts mutations and queues 1s debounced atomic write to `.tmp` file).
   - Broadcast updated state to room participants:
   ```typescript
   case MessageType.PLAY_CARD: {
       roomConfig.score += 10;
       roomConfig.currentTurn = socket.userId || '';

       const syncMessage: GlobalSocketMessage = {
           type: MessageType.GAME_SYNC,
           payload: { score: roomConfig.score, currentTurn: roomConfig.currentTurn }
       };

       [...io.clients]
           .filter((client): client is ActivityWebSocket => client.readyState === 1 && client.instanceId === instanceId)
           .forEach(client => client.sendJSON(syncMessage));
       break;
   }
   ```

---

### Step 3: Frontend Dispatcher, Store, & UI (`client/`)

1. **Client Message Handler ([client/src/handler/MainHandler.ts](file:///d:/js/discord%20activity/sample-activity/client/src/handler/MainHandler.ts))**:
   - Catch server messages and invoke `updateConfig`:
   ```typescript
   export function MainHandler(message: GlobalSocketMessage) {
       switch (message.type) {
           case MessageType.GAME_SYNC:
               updateConfig({
                   score: message.payload.score,
                   currentTurn: message.payload.currentTurn
               });
               break;
       }
   }
   ```

2. **Client Config Schema ([client/src/config/index.ts](file:///d:/js/discord%20activity/sample-activity/client/src/config/index.ts))**:
   - Extend `ClientConfigSchema` with new properties and scene enum values.

3. **React Scene Implementation ([client/src/scenes/](file:///d:/js/discord%20activity/sample-activity/client/src/scenes/))**:
   - Build React scene components. Consume hooks and utilities.
   - Mount scene routing in [client/src/scenes/MainScene.tsx](file:///d:/js/discord%20activity/sample-activity/client/src/scenes/MainScene.tsx).

---

## 2. Built-in Utilities & Hooks API Reference

### 2.1 `useDiscord` Hook
- **Import Path**: `import { useDiscord } from '../internal/context/DiscordContext';`
- **Description**: Provides access to Discord Embedded App SDK state, active voice channel participants, and WebSocket sending interface.
- **Return Signature**:
  ```typescript
  interface DiscordContextType {
      user: DiscordUser | null;             // Authenticated Discord user profile
      status: AuthStatus;                   // 'Initializing' | 'Ready' | 'Error' | 'Browser'
      participants: Participant[];          // Connected voice channel participants
      instanceId: string | null;            // Active Discord activity instance ID
      code: string | null;                  // OAuth authorization code
      error: string | null;                 // Error message string
      isAuthorized: boolean;                // Authentication success flag
      isConnected: boolean;                 // WebSocket connection state
      send: (data: GlobalSocketMessage) => void; // Send WebSocket message to server
  }
  ```
- **Example Usage**:
  ```typescript
  const { user, participants, send, status } = useDiscord();
  ```

---

### 2.2 `useConfig` Store & `updateConfig` Utility
- **Import Path**: `import { useConfig, updateConfig } from '../internal/hooks/useConfig';`
- **Description**: Zustand store for client state synchronized to `localStorage` key `'app_config'`.
- **Selector Pattern**: Always use selector arrow functions (`config => config.score`) to observe specific state properties. This prevents unnecessary re-renders when unrelated store properties mutate.
- **Example Usage**:
  ```typescript
  // Observes ONLY score property. Re-renders component ONLY when score changes.
  const score = useConfig(config => config.score);

  // Update store from handlers or components:
  updateConfig({ score: 100 });
  ```

---

### 2.3 `useSound` Hook
- **Import Path**: `import { useSound } from '../internal/hooks/useSound';`
- **Description**: Audio element pool manager. Automatically synchronizes audio volume with `useConfig(config => config.volume.master)` in real time.
- **Parameters**: `key: SoundType` (Keys declared in `client/src/assets/index.ts`).
- **Return Signature**: `{ play: () => void }`
- **Example Usage**:
  ```typescript
  const { play: playPingSound } = useSound('PING');
  playPingSound();
  ```

---

### 2.4 `useAssetLoader` Hook
- **Import Path**: `import { useAssetLoader } from '../internal/hooks/useAssetLoader';`
- **Description**: Preloads image and audio assets, tracking progress percentage for splash screens.
- **Parameters**: `assetUrls: string[]`
- **Return Signature**:
  ```typescript
  interface AssetLoaderResult {
      isLoaded: boolean;   // True when all assets finish loading
      progress: number;   // Loading progress percentage (0 - 100)
      isError: boolean;    // True if any asset fails to load
  }
  ```
- **Example Usage**:
  ```typescript
  const { isLoaded, progress, isError } = useAssetLoader(['/favicon.png', '/ping.mp3']);
  ```

---

### 2.5 Utility Helper Functions (`client/src/utils/utils.ts`)

#### `getAvatarUrl(user: DiscordUser | null): string`
- **Description**: Generates valid avatar URL. Returns Discord CDN URL if custom avatar hash exists; otherwise generates default Discord avatar based on discriminator/user ID.
- **Parameters**: `user: DiscordUser | null`
- **Example**: `<img src={getAvatarUrl(user)} alt="Avatar" />`

#### `getName(participant: Participant | DiscordUser | null): string`
- **Description**: Resolves user display name. Evaluates `global_name` first; falls back to `username` if `global_name` is null.
- **Parameters**: `participant: Participant | DiscordUser | null`
- **Example**: `const name = getName(user);`

#### `isBrowser(status: AuthStatus): boolean`
- **Description**: Checks if current environment is mock browser mode (`status === 'Browser'`).
- **Parameters**: `status: AuthStatus`
- **Example**: `if (isBrowser(status)) { console.log('Development Mode'); }`

---

## 3. Critical Coding Rules & Safeguards

1. **Vite Hot Module Replacement (HMR)**:
   - `hmr: false` and `watch: { ignored: ['**/*'] }` in `client/vite.config.ts` must remain disabled during Discord Embedded SDK testing.
   - Enabling HMR causes page re-mounts on file save, triggering rapid Discord OAuth authorization API requests (`/api/oauth2/token`) resulting in 429 Rate Limit IP bans.
2. **Discord Discriminator Spec**:
   - `discriminator` in `DiscordUserSchema` is typed as `z.string().nullable().optional()`.
   - Never assume discriminator is a non-null 4-digit string due to Discord unique handle migration.
3. **No `any` Types**:
   - Strict typing must be enforced. When updating Zustand store in `useConfig.ts`, destructure functions (`const { patch, ...data } = state`) to pass pure data objects to `structuredClone()` and return explicit interface types.
4. **Local Multi-Tab Debugging**:
   - Test multiplayer logic locally by opening multiple browser tabs to `http://localhost:3030`.
   - Server recognizes `code === 'browser'` and creates isolated mock user sessions (`Browser`), allowing real-time multi-user testing with zero Discord API rate limit risk.
