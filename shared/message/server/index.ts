import { z } from "zod";


export const ServerMessageType = {
    SERVER_MESSAGE: 'SERVER_MESSAGE',
} as const;

export const ServerMessagesSchema = [
    z.object({
        type: z.literal(ServerMessageType.SERVER_MESSAGE),
        payload: z.object({
            count: z.number()
        })
    }),
] as const;
