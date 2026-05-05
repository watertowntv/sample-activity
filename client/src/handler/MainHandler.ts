import { MessageType, type GlobalSocketMessage } from "@activity/shared";
import { updateConfig } from "../internal/hooks/useConfig.ts";


/**
 * Main Handler
 * @param message Socket Message
 */
export function MainHandler(message: GlobalSocketMessage) {
    switch (message.type) {
        case MessageType.SERVER_MESSAGE:
            updateConfig({
                count: message.payload.count
            });
            break;
    }
}
