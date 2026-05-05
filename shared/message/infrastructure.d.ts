import { z } from "zod";
export declare const InfraMessageType: {
    readonly AUTH: "AUTH";
    readonly INIT: "INIT";
    readonly ERROR: "ERROR";
};
export declare const AuthPayloadSchema: z.ZodObject<{
    code: z.ZodString;
    instanceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    instanceId: string;
}, {
    code: string;
    instanceId: string;
}>;
export declare const InitPayloadSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        global_name: z.ZodNullable<z.ZodString>;
        avatar: z.ZodNullable<z.ZodString>;
        discriminator: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        username: string;
        global_name: string | null;
        avatar: string | null;
        discriminator: string;
    }, {
        id: string;
        username: string;
        global_name: string | null;
        avatar: string | null;
        discriminator: string;
    }>;
    accessToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user: {
        id: string;
        username: string;
        global_name: string | null;
        avatar: string | null;
        discriminator: string;
    };
    accessToken: string;
}, {
    user: {
        id: string;
        username: string;
        global_name: string | null;
        avatar: string | null;
        discriminator: string;
    };
    accessToken: string;
}>;
export declare const InfrastructureMessagesSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"AUTH">;
    payload: z.ZodObject<{
        code: z.ZodString;
        instanceId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        instanceId: string;
    }, {
        code: string;
        instanceId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "AUTH";
    payload: {
        code: string;
        instanceId: string;
    };
}, {
    type: "AUTH";
    payload: {
        code: string;
        instanceId: string;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"INIT">;
    payload: z.ZodObject<{
        user: z.ZodObject<{
            id: z.ZodString;
            username: z.ZodString;
            global_name: z.ZodNullable<z.ZodString>;
            avatar: z.ZodNullable<z.ZodString>;
            discriminator: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            username: string;
            global_name: string | null;
            avatar: string | null;
            discriminator: string;
        }, {
            id: string;
            username: string;
            global_name: string | null;
            avatar: string | null;
            discriminator: string;
        }>;
        accessToken: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        user: {
            id: string;
            username: string;
            global_name: string | null;
            avatar: string | null;
            discriminator: string;
        };
        accessToken: string;
    }, {
        user: {
            id: string;
            username: string;
            global_name: string | null;
            avatar: string | null;
            discriminator: string;
        };
        accessToken: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "INIT";
    payload: {
        user: {
            id: string;
            username: string;
            global_name: string | null;
            avatar: string | null;
            discriminator: string;
        };
        accessToken: string;
    };
}, {
    type: "INIT";
    payload: {
        user: {
            id: string;
            username: string;
            global_name: string | null;
            avatar: string | null;
            discriminator: string;
        };
        accessToken: string;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"ERROR">;
    payload: z.ZodObject<{
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
    }, {
        message: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "ERROR";
    payload: {
        message: string;
    };
}, {
    type: "ERROR";
    payload: {
        message: string;
    };
}>]>;
