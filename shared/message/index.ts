import { z } from "zod";
import { InfrastructureMessagesSchema, InfraMessageType, AuthPayloadSchema, InitPayloadSchema } from "./infrastructure.ts";
import { ClientMessageType, ClientMessagesSchema } from "./client";
import { ServerMessageType, ServerMessagesSchema } from "./server";

export * from "./infrastructure.ts";
export * from "./client/index.ts";
export * from "./server/index.ts";

export const MessageType = {
    ...InfraMessageType,
    ...ClientMessageType,
    ...ServerMessageType,
} as const;

export type MessageType = keyof typeof MessageType;

export const GlobalSocketMessageSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal(InfraMessageType.AUTH), payload: AuthPayloadSchema }),
    z.object({ type: z.literal(InfraMessageType.INIT), payload: InitPayloadSchema }),
    z.object({ type: z.literal(InfraMessageType.ERROR), payload: z.object({ message: z.string() }) }),
    z.object({ type: z.literal(ClientMessageType.CLIENT_CONNECTION), payload: z.object({}) }),
    z.object({ type: z.literal(ClientMessageType.CLIENT_MESSAGE), payload: z.object({ name: z.string() }) }),
    z.object({ type: z.literal(ServerMessageType.SERVER_MESSAGE), payload: z.object({ count: z.number() }) }),
]);

export type GlobalSocketMessage = z.infer<typeof GlobalSocketMessageSchema>;
