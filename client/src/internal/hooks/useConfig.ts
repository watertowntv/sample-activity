import { create } from 'zustand';
import { type ClientConfig, INITIAL_CONFIG } from '../../config';

const STORAGE_KEY = 'app_config';

const merge = <T extends object>(targetObject: T, sourceObject: Record<string, unknown>): T => {
    const targetRecord = targetObject as Record<string, unknown>;

    for (const key in sourceObject) {
        const sourceValue = sourceObject[key];

        if (sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
            let targetValue = targetRecord[key];
            if (!targetValue || typeof targetValue !== 'object') {
                targetValue = targetRecord[key] = {};
            }

            merge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
        } else {
            targetRecord[key] = sourceValue;
        }
    }

    return targetObject;
};

const getInitial = (): ClientConfig => {
    const initialBase = structuredClone(INITIAL_CONFIG);

    try {
        const storedConfig = localStorage.getItem(STORAGE_KEY);
        if (!storedConfig) return initialBase;

        return merge(initialBase, JSON.parse(storedConfig) as Record<string, unknown>);
    } catch {
        return initialBase;
    }
};

export const useConfig = create<ClientConfig & { patch: (partialConfig: Partial<ClientConfig>) => void }>((set) => ({
    ...getInitial(),
    patch: (partialConfig) => set((currentState) => {
        const { patch, ...data } = currentState;
        const nextConfiguration = structuredClone(data);
        const mergedConfiguration = merge(nextConfiguration, partialConfig as Record<string, unknown>);

        return { ...mergedConfiguration, patch };
    })
}));

useConfig.subscribe((state) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { patch, ...data } = state;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
});

export const useConfigKey = <K extends keyof ClientConfig>(key: K) => useConfig(config => config[key]);
export const updateConfig = (config: Partial<ClientConfig>) => useConfig.getState().patch(config);
