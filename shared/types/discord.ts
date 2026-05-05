import { z } from "zod";


export const DiscordUserSchema = z.object({
    id: z.string(),
    username: z.string(),
    global_name: z.string().nullable(),
    avatar: z.string().nullable(),
    discriminator: z.string()
});

export type DiscordUser = z.infer<typeof DiscordUserSchema>;

export const ParticipantSchema = z.object({
    id: z.string(),
    username: z.string(),
    global_name: z.string().nullable().optional(),
    avatar: z.string().nullable().optional()
});

export type Participant = z.infer<typeof ParticipantSchema>;

export type AuthStatus = 'Initializing' | 'Ready' | 'Error' | 'Browser';
