import { create } from 'zustand';
import { type ClientConfig, INITIAL_CONFIG } from '../../config';

const STORAGE_KEY = 'app_config';

const merge = (t: Record<string, unknown>, s: Record<string, unknown>) => {
    for (const k in s) {
        const sv = s[k];

        if (sv !== null && typeof sv === 'object' && !Array.isArray(sv)) {
            let tv = t[k];
            if (!tv || typeof tv !== 'object') tv = t[k] = {};

            merge(tv as Record<string, unknown>, sv as Record<string, unknown>);
        } else t[k] = sv;
    }

    return t;
};

const getInitial = (): ClientConfig => {
    const base = structuredClone(INITIAL_CONFIG);

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return base;

        return merge(base, JSON.parse(stored)) as ClientConfig;
    } catch {
        return base;
    }
};

export const useConfig = create<ClientConfig & { patch: (config: Partial<ClientConfig>) => void }>((set) => ({
    ...getInitial(),
    patch: (config) => set((state) => {
        const { patch, ...data } = state;
        const next = structuredClone(data) as ClientConfig;
        const merged = merge(next as Record<string, unknown>, config as Record<string, unknown>) as ClientConfig;
        
        return { ...merged, patch };
    })
}));

useConfig.subscribe((state) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { patch, ...data } = state;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
});

export const useConfigKey = <K extends keyof ClientConfig>(key: K) => useConfig(s => s[key]);
export const updateConfig = (config: Partial<ClientConfig>) => useConfig.getState().patch(config);
