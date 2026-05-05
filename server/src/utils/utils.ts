import { WebSocketServer } from 'ws';
import { ActivityWebSocket } from "../internal/types/index.js";


export const participants = (
    io: WebSocketServer,
    instanceId: string
): ActivityWebSocket[] => (Array.from(io.clients) as ActivityWebSocket[]).filter((client) => {
    return client.readyState === 1 && client.instanceId === instanceId;
});

export const broadcastIO = (
    io: WebSocketServer,
    instanceId: string,
    callback: (client: ActivityWebSocket) => void
) => {
    participants(io, instanceId).forEach((client) => {
        callback(client);
    });
};
