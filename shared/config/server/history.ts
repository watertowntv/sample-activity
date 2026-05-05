import { z } from "zod";

export const HistoryRecordSchema = z.object({
    user: z.string(),
    at: z.number()
});

export type HistoryRecord = z.infer<typeof HistoryRecordSchema>;
