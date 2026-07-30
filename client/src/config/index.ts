import { SceneType } from "./scene.ts";

export * from "./scene.ts";


export interface ClientConfig {
    scene: SceneType;
    count: number;
    volume: {
        master: number;
    };
}

export const INITIAL_CONFIG: ClientConfig = {
    scene: SceneType.Count,
    count: 0,
    volume: {
        master: 1,
    },
};
