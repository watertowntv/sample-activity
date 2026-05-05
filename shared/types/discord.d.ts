import { z } from "zod";
export declare const DiscordUserSchema: z.ZodObject<{
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
export type DiscordUser = z.infer<typeof DiscordUserSchema>;
export declare const ParticipantSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    global_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    username: string;
    global_name?: string | null | undefined;
    avatar?: string | null | undefined;
}, {
    id: string;
    username: string;
    global_name?: string | null | undefined;
    avatar?: string | null | undefined;
}>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type AuthStatus = 'Initializing' | 'Ready' | 'Error' | 'Browser';
