import { WebSocketServer } from 'ws';
import { ActivityWebSocket } from "../internal/types";


export const participants = (
    io: WebSocketServer,
    instanceId: string
): ActivityWebSocket[] => (Array.from(io.clients) as ActivityWebSocket[]).filter((client) => {
    return client.readyState === 1 && client.instanceId === instanceId;
});

// noinspection JSUnusedGlobalSymbols
export const broadcastIO = (
    io: WebSocketServer,
    instanceId: string,
    callback: (client: ActivityWebSocket) => void
) => {
    participants(io, instanceId).forEach((client) => {
        callback(client);
    });
};
