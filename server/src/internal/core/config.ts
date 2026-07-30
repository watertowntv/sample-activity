import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_CONSTANTS } from '@activity/shared';
import { type ServerIO } from '../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_ROOT = path.join(__dirname, '../../db');

if (fs.existsSync(DB_ROOT)) {
    ['instance', 'user', 'static'].forEach(type => {
        const typeDir = path.join(DB_ROOT, type);
        if (fs.existsSync(typeDir)) {
            fs.readdirSync(typeDir).forEach(f => {
                if (f.endsWith('.tmp')) {
                    const fullPath = path.join(typeDir, f);
                    try { if (fs.statSync(fullPath).isFile()) fs.unlinkSync(fullPath); } catch {}
                }
            });
        }
    });
}

const instances = new Map<string, unknown>();
const saveTimeouts = new Map<string, NodeJS.Timeout>();
const activeWrites = new Set<string>();
const pendingSaves = new Set<string>();

export type ConfigType = 'instance' | 'user' | 'static';

const IS_PROXY = Symbol('is_proxy');
const RAW = Symbol('raw');

interface ProxyWithRaw {
    [RAW]?: unknown;
}

export function useServerConfig<T extends object>(type: ConfigType, id: string, initialConfig: T, autoSave: boolean = false): T & ServerIO {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
    const key = `${type}:${safeId}`;
    if (instances.has(key)) return instances.get(key) as T & ServerIO;

    const proxyCache = new WeakMap<object, unknown>();
    const targetDir = path.join(DB_ROOT, type);
    const filePath = path.join(targetDir, `${safeId}.json`);

    let data: T;

    if (fs.existsSync(filePath)) {
        try {
            const loaded = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const merge = (target: Record<string, unknown>, source: Record<string, unknown>) => {
                for (const k in source) {
                    const sv = source[k];
                    if (sv !== null && typeof sv === 'object' && !Array.isArray(sv)) {
                        let tv = target[k];
                        if (!tv || typeof tv !== 'object') tv = target[k] = {};
                        merge(tv as Record<string, unknown>, sv as Record<string, unknown>);
                    } else target[k] = sv;
                }

                return target;
            };

            data = merge(structuredClone(initialConfig) as Record<string, unknown>, loaded as Record<string, unknown>) as T;
        } catch (e) {
            console.error(`[Config] Parse Error (${key}):`, e);
            data = structuredClone(initialConfig);
        }
    } else data = structuredClone(initialConfig);

    const io: ServerIO = {
        $save: () => {
            if (saveTimeouts.has(key)) return;
            if (activeWrites.has(key)) {
                pendingSaves.add(key);
                return;
            }

            const currentInstance = instances.get(key);
            if (!currentInstance) return;

            const timeout = setTimeout(() => {
                activeWrites.add(key);
                saveTimeouts.delete(key);

                try {
                    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                    const json = JSON.stringify(data, null, 2);
                    const tempPath = `${filePath}.tmp`;

                    fs.writeFile(tempPath, json, 'utf-8', (err) => {
                        const finalize = () => {
                            activeWrites.delete(key);

                            if (pendingSaves.has(key)) {
                                pendingSaves.delete(key);
                                io.$save();
                            }
                        };

                        if (err) {
                            console.error(`[Config] Save Error (${key}):`, err);
                            finalize();
                            return;
                        }

                        if (instances.get(key) !== currentInstance) {
                            try { fs.unlinkSync(tempPath); } catch {}
                            finalize();
                            return;
                        }

                        fs.rename(tempPath, filePath, (err) => {
                            if (err) console.error(`[Config] Rename Error (${key}):`, err);
                            finalize();
                        });
                    });
                } catch (e) {
                    activeWrites.delete(key);
                    console.error(`[Config] Sync Save Error (${key}):`, e);
                    pendingSaves.delete(key);
                }
            }, APP_CONSTANTS.CONFIG_SAVE_DELAY);

            saveTimeouts.set(key, timeout);
        }
    };

    const wrap = <U extends object>(target: U): U => {
        if (target === null || typeof target !== 'object') return target;
        if ((target as any)[IS_PROXY]) return target;
        if (proxyCache.has(target)) return proxyCache.get(target) as U;

        const proxy = new Proxy(target, {
            get: (t, p) => {
                if (p === IS_PROXY) return true;
                if (p === RAW) return t;
                if (p === '$save') return io.$save;

                const value = Reflect.get(t, p);
                return (typeof p === 'string' && value !== null && typeof value === 'object') ? wrap(value) : value;
            },
            set: (t, p, v) => {
                const rawValue = (v && (v as ProxyWithRaw)[RAW]) ? (v as ProxyWithRaw)[RAW] : v;
                const valueToSet = (rawValue !== null && typeof rawValue === 'object') 
                    ? structuredClone(rawValue) 
                    : rawValue;
                
                const res = Reflect.set(t, p, valueToSet);
                if (autoSave && typeof p === 'string') io.$save();

                return res;
            },
            deleteProperty: (t, p) => {
                const res = Reflect.deleteProperty(t, p);
                if (autoSave && typeof p === 'string') io.$save();

                return res;
            }
        });
        proxyCache.set(target, proxy);
        return proxy as U;
    };

    const instance = wrap(data) as T & ServerIO;
    instances.set(key, instance);

    return instance;
}

// noinspection JSUnusedGlobalSymbols
export function saveAllConfigs(): void {
    for (const instance of instances.values())
        if (instance && typeof (instance as any).$save === 'function')
            (instance as any).$save();
}

export async function flushAllConfigs(): Promise<void> {
    for (const [key, instance] of instances) {
        if (saveTimeouts.has(key)) {
            clearTimeout(saveTimeouts.get(key));
            saveTimeouts.delete(key);
        }
        
        while (activeWrites.has(key)) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const [type, id] = key.split(':');
        const filePath = path.join(DB_ROOT, type, `${id}.json`);

        try {
            if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true });
            const tempPath = `${filePath}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(instance, null, 2), 'utf-8');
            fs.renameSync(tempPath, filePath);
        } catch (e) {
            console.error(`[Config] Flush Error (${key}):`, e);
        }
    }
}

export function unloadServerConfig(type: ConfigType, id: string): void {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
    const key = `${type}:${safeId}`;

    if (saveTimeouts.has(key) || activeWrites.has(key) || pendingSaves.has(key)) {
        if (saveTimeouts.has(key)) {
            clearTimeout(saveTimeouts.get(key));
            saveTimeouts.delete(key);
        }

        const instance = instances.get(key);
        if (instance) {
            const filePath = path.join(DB_ROOT, type, `${safeId}.json`);
            try {
                if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true });
                const tempPath = `${filePath}.tmp`;
                fs.writeFileSync(tempPath, JSON.stringify(instance, null, 2), 'utf-8');
                fs.renameSync(tempPath, filePath);
            } catch (e) { console.error(`[Config] Unload Flush Error (${key}):`, e); }
        }
    }

    pendingSaves.delete(key);
    instances.delete(key);
}
