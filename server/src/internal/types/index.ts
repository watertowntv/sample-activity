import { WebSocket } from "ws";
import { type GlobalSocketMessage } from "@activity/shared";


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
