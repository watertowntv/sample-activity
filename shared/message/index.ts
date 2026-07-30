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

type DiscriminatedUnionOptions = Parameters<typeof z.discriminatedUnion>[1];

const schemas = [
    ...InfrastructureMessagesSchema,
    ...ClientMessagesSchema,
    ...ServerMessagesSchema,
] as unknown as DiscriminatedUnionOptions;

export const GlobalSocketMessageSchema = z.discriminatedUnion("type", schemas);

export type GlobalSocketMessage = z.infer<typeof GlobalSocketMessageSchema>;