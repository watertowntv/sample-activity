import { z } from "zod";
export * from "./infrastructure.ts";
export * from "./client/index.ts";
export * from "./server/index.ts";
export declare const MessageType: {
    readonly SERVER_MESSAGE: "SERVER_MESSAGE";
    readonly CLIENT_CONNECTION: "CLIENT_CONNECTION";
    readonly CLIENT_MESSAGE: "CLIENT_MESSAGE";
    readonly AUTH: "AUTH";
    readonly INIT: "INIT";
    readonly ERROR: "ERROR";
};
export type MessageType = keyof typeof MessageType;
export declare const GlobalSocketMessageSchema: z.ZodDiscriminatedUnion<"type", [z.ZodDiscriminatedUnionOption<"type">, ...z.ZodDiscriminatedUnionOption<"type">[]]>;
export type GlobalSocketMessage = z.infer<typeof GlobalSocketMessageSchema>;
