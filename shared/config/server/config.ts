import { z } from "zod";
import { HistoryRecordSchema } from "./history.ts";

export interface ServerIO {
    $save(): void;
}

export const GlobalServerConfigSchema = z.object({
    count: z.number(),
    history: z.array(HistoryRecordSchema)
});

export type GlobalServerConfig = z.infer<typeof GlobalServerConfigSchema>;
