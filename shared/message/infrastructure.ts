import { z } from "zod";
// noinspection ES6PreferShortImport
import { DiscordUserSchema } from "../types/discord.ts";


export const InfraMessageType = {
    AUTH: 'AUTH',
    INIT: 'INIT',
    ERROR: 'ERROR',
} as const;


export const AuthPayloadSchema = z.object({ code: z.string(), instanceId: z.string() });
export const InitPayloadSchema = z.object({ user: DiscordUserSchema, accessToken: z.string() });

export const InfrastructureMessagesSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal(InfraMessageType.AUTH), payload: AuthPayloadSchema }),
    z.object({ type: z.literal(InfraMessageType.INIT), payload: InitPayloadSchema }),
    z.object({ type: z.literal(InfraMessageType.ERROR), payload: z.object({ message: z.string() }) }),
]);
