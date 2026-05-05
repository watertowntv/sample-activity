import { z } from "zod";

export const SceneType = {
    Count: 'Count',
} as const;

export const SceneTypeSchema = z.enum([
    SceneType.Count
]);


export type SceneType = z.infer<typeof SceneTypeSchema>;
