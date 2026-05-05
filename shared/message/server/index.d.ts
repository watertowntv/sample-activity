import { z } from "zod";
export declare const ServerMessageType: {
    readonly SERVER_MESSAGE: "SERVER_MESSAGE";
};
export declare const ServerMessagesSchema: z.ZodObject<{
    type: z.ZodLiteral<"SERVER_MESSAGE">;
    payload: z.ZodObject<{
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        count: number;
    }, {
        count: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "SERVER_MESSAGE";
    payload: {
        count: number;
    };
}, {
    type: "SERVER_MESSAGE";
    payload: {
        count: number;
    };
}>[];
