
export const SceneType = {
    Count: 'Count',
} as const;

export type SceneType = typeof SceneType[keyof typeof SceneType];
