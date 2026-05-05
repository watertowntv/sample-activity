import { z } from "zod";
import { SceneTypeSchema } from "./scene.ts";


export const ClientConfigSchema = z.object({
    scene: SceneTypeSchema,
    count: z.number(),
    volume: z.object({
        master: z.number()
    })
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;
