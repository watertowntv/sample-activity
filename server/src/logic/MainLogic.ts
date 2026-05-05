import { MessageType, type GlobalSocketMessage, type HistoryRecord, type GlobalServerConfig } from '@activity/shared';
import type { WebSocketServer } from 'ws';
import type { ActivityWebSocket } from '../internal/types';
import { useServerConfig } from '../internal/core/config.js';
import { INITIAL_GLOBAL_CONFIG } from '../config.js';


/**
 * Main Logic
 * @param io Broadcast Socket
 * @param socket Client Socket
 * @param _instanceId Activity Instance ID
 * @param message Socket Message
 */
export function MainLogic(
    io: WebSocketServer,
    socket: ActivityWebSocket,
    _instanceId: string,
    message: GlobalSocketMessage
): void {
    const config = useServerConfig<GlobalServerConfig>(
        'static',
        'global',
        INITIAL_GLOBAL_CONFIG,
        true
    );

    switch (message.type) {
        case MessageType.CLIENT_CONNECTION:
            socket.sendJSON({
                type: MessageType.SERVER_MESSAGE,
                payload: { count: config.count }
            });
            break;

        case MessageType.CLIENT_MESSAGE: {
            config.count += 1;

            const record: HistoryRecord = {
                user: message.payload.name,
                at: Date.now()
            };
            config.history.push(record); 
            if (config.history.length > 5) config.history.shift();

            const serverMessage: GlobalSocketMessage = {
                type: MessageType.SERVER_MESSAGE,
                payload: { count: config.count }
            };

            [...io.clients]
                .filter((c): c is ActivityWebSocket => c.readyState === 1)
                .forEach(c => c.sendJSON(serverMessage));
            break;
        }

        default:
            break;
    }
}
