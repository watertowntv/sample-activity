import { z } from "zod";
import { InfrastructureMessagesSchema, InfraMessageType } from "./infrastructure.ts";
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
    ...InfrastructureMessagesSchema,
    ...ClientMessagesSchema,
    ...ServerMessagesSchema,
]);

export type GlobalSocketMessage = z.infer<typeof GlobalSocketMessageSchema>;