import { z } from "zod";
import { SceneTypeSchema, SceneType } from "./scene.ts";

export * from "./scene.ts";


export const ClientConfigSchema = z.object({
    scene: SceneTypeSchema.default(SceneType.Count),
    count: z.number().default(0),
    volume: z.object({
        master: z.number().default(1)
    }).default({ master: 1 })
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;

export const INITIAL_CONFIG: ClientConfig = ClientConfigSchema.parse({});
