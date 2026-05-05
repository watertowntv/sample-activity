import { z } from "zod";
import { HistoryRecordSchema } from "./history.ts";

export * from "./history.ts";

export const GlobalServerConfigSchema = z.object({
    count: z.number().default(0),
    history: z.array(HistoryRecordSchema).default([])
});

export type GlobalServerConfig = z.infer<typeof GlobalServerConfigSchema>;

export const INITIAL_GLOBAL_CONFIG: GlobalServerConfig = GlobalServerConfigSchema.parse({});
