import { z } from "zod";
export declare const ClientMessageType: {
    readonly CLIENT_CONNECTION: "CLIENT_CONNECTION";
    readonly CLIENT_MESSAGE: "CLIENT_MESSAGE";
};
export declare const ClientMessagesSchema: (z.ZodObject<{
    type: z.ZodLiteral<"CLIENT_CONNECTION">;
    payload: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
}, "strip", z.ZodTypeAny, {
    type: "CLIENT_CONNECTION";
    payload: {};
}, {
    type: "CLIENT_CONNECTION";
    payload: {};
}> | z.ZodObject<{
    type: z.ZodLiteral<"CLIENT_MESSAGE">;
    payload: z.ZodObject<{
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
    }, {
        name: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "CLIENT_MESSAGE";
    payload: {
        name: string;
    };
}, {
    type: "CLIENT_MESSAGE";
    payload: {
        name: string;
    };
}>)[];
