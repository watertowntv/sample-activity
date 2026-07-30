import { z } from "zod";
// noinspection ES6PreferShortImport
import { DiscordUserSchema } from "../types/discord.ts";
import {ClientMessageType} from "./client";


export const InfraMessageType = {
    AUTH: 'AUTH',
    INIT: 'INIT',
    ERROR: 'ERROR',
    CLIENT_CONNECTION: 'CLIENT_CONNECTION'
} as const;


export const AuthPayloadSchema = z.object({ code: z.string(), instanceId: z.string() });
export const InitPayloadSchema = z.object({ user: DiscordUserSchema, accessToken: z.string() });

export const InfrastructureMessagesSchema = [
    z.object({ type: z.literal(InfraMessageType.AUTH), payload: AuthPayloadSchema }),
    z.object({ type: z.literal(InfraMessageType.INIT), payload: InitPayloadSchema }),
    z.object({ type: z.literal(InfraMessageType.ERROR), payload: z.object({ message: z.string() }) }),
    z.object({ type: z.literal(InfraMessageType.CLIENT_CONNECTION), payload: z.object({}) }),
] as const;
