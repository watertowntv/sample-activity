import { z } from "zod";


export const ClientMessageType = {
    CLIENT_MESSAGE: 'CLIENT_MESSAGE',
} as const;

export const ClientMessagesSchema = [
    z.object({
        type: z.literal(ClientMessageType.CLIENT_MESSAGE),
        payload: z.object({
            name: z.string()
        })
    }),
] as const;
