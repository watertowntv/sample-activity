import { HistoryRecord } from "./history.ts";

export * from "./history.ts";

export interface GlobalServerConfig {
    count: number;
    history: HistoryRecord[];
}

export const INITIAL_GLOBAL_CONFIG: GlobalServerConfig = {
    count: 0,
    history: [],
};
