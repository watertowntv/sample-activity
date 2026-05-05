import { WebSocketServer } from 'ws';
import type { Server } from 'http';
import { MainLogic } from '../../logic/MainLogic.js';
import { requestDiscordToken, requestDiscordUser } from "../services/discordService.js";
import { MessageType, GlobalSocketMessageSchema, APP_CONSTANTS } from "@activity/shared";
import type { ActivityWebSocket } from "../types";
import { unloadServerConfig } from './config.js';

const cleanupTimeouts = new Map<string, NodeJS.Timeout>();
const userSessions = new Map<string, Set<ActivityWebSocket>>();
const instanceSessions = new Map<string, Set<ActivityWebSocket>>();

export const initSocketServer = (server: Server) => {
    // noinspection JSUnusedGlobalSymbols
    const wss = new WebSocketServer({
        server,
        maxPayload: APP_CONSTANTS.WS_MAX_PAYLOAD,

        verifyClient: (info, done) => {
            const origin = (info.origin || '').toLowerCase();
            const host = (info.req.headers.host || '').toLowerCase();

            let originDomain = origin;
            try {
                const url = new URL(origin);
                originDomain = url.hostname;
            } catch (e) {}

            const isLocal = originDomain === 'localhost' || originDomain === '127.0.0.1';
            const isDiscord = originDomain.endsWith('discord.com') || originDomain.endsWith('discordsays.com');

            const trustedDomains = process.env.ALLOWED_ORIGINS?.split(',').map(d => d.trim().toLowerCase()) ?? [];
            const isTrustedCustom = trustedDomains.some(domain => domain && (originDomain === domain || originDomain.endsWith('.' + domain)));

            const hostDomain = host.split(':')[0];

            if (isLocal || isDiscord || isTrustedCustom || (hostDomain && (originDomain === hostDomain || originDomain.endsWith('.' + hostDomain)))) {
                done(true);
            } else {
                console.warn(`[Security] Blocked connection from: ${origin}`);
                done(false, 403, 'Unauthorized Origin');
            }
        }
    });

    wss.on('connection', (ws: ActivityWebSocket) => {
        ws.isAlive = true;
        ws.on('pong', () => ws.isAlive = true);
        ws.isAuthenticated = false;
        ws.messageCount = 0;
        ws.lastResetTime = Date.now();
        ws.sendJSON = (data) => { if (ws.readyState === 1) ws.send(JSON.stringify(data)); };

        const authTimeout = setTimeout(() => { if (!ws.isAuthenticated) ws.terminate(); }, APP_CONSTANTS.AUTH_GRACE_PERIOD);

        ws.on('message', async (rawData) => {
            try {
                if (rawData instanceof Buffer && rawData.length > APP_CONSTANTS.WS_MAX_PAYLOAD) return ws.terminate();

                const now = Date.now();
                if (now - (ws.lastResetTime || 0) < 1000) {
                    ws.messageCount = (ws.messageCount || 0) + 1;
                    if ((ws.messageCount || 0) > APP_CONSTANTS.WS_MESSAGE_RATE_LIMIT) return;
                } else {
                    ws.messageCount = 1;
                    ws.lastResetTime = now;
                }

                const json = JSON.parse(rawData.toString());
                const result = GlobalSocketMessageSchema.safeParse(json);
                if (!result.success) return;

                const message = result.data;
                if (message.type === MessageType.AUTH) {
                    if (ws.isAuthenticated) return;

                    try {
                        const { code, instanceId } = message.payload;
                        let user;
                        let accessToken = 'browser-token';

                        if (code === 'browser' && process.env.NODE_ENV !== 'production') {
                            user = {
                                id: 'browser', username: 'browser', global_name: 'browser',
                                avatar: null, discriminator: '0000'
                            };
                        } else {
                            const tokenData = await requestDiscordToken(code);
                            user = await requestDiscordUser(tokenData.access_token);
                            accessToken = tokenData.access_token;
                        }

                        if (ws.readyState !== 1) return;

                        ws.isAuthenticated = true;
                        ws.instanceId = instanceId;
                        ws.userId = user.id;
                        ws.username = user.username;
                        clearTimeout(authTimeout);

                        const instanceKey = `instance:${instanceId}`;
                        if (cleanupTimeouts.has(instanceKey)) {
                            clearTimeout(cleanupTimeouts.get(instanceKey)!);
                            cleanupTimeouts.delete(instanceKey);
                        }

                        if (!userSessions.has(user.id)) userSessions.set(user.id, new Set());
                        userSessions.get(user.id)!.add(ws);
                        if (!instanceSessions.has(instanceId)) instanceSessions.set(instanceId, new Set());
                        instanceSessions.get(instanceId)!.add(ws);

                        const userKey = `user:${user.id}`;
                        if (cleanupTimeouts.has(userKey)) {
                            clearTimeout(cleanupTimeouts.get(userKey)!);
                            cleanupTimeouts.delete(userKey);
                        }

                        ws.sendJSON({ type: MessageType.INIT, payload: { user, accessToken } });
                    } catch (e) {
                        ws.sendJSON({
                            type: MessageType.ERROR,
                            payload: { message: e instanceof Error ? e.message : 'Auth Failed' }
                        });
                    }

                    return;
                }

                if (ws.isAuthenticated && ws.instanceId) MainLogic(wss, ws, ws.instanceId, message);
            } catch (e) {
                console.error("[Socket] Handler Error:", e);
            }
        });

        ws.on('close', () => {
            clearTimeout(authTimeout);
            try {
                if (!ws.isAuthenticated) return;
                
                if (ws.userId) {
                    const userId = ws.userId;
                    const sessions = userSessions.get(userId);
                    if (sessions) {
                        sessions.delete(ws);

                        if (sessions.size === 0) {
                            userSessions.delete(userId);
                            const key = `user:${userId}`;

                            if (cleanupTimeouts.has(key)) clearTimeout(cleanupTimeouts.get(key));
                            const timeout = setTimeout(() => {
                                unloadServerConfig('user', userId);
                                cleanupTimeouts.delete(key);
                            }, APP_CONSTANTS.INSTANCE_CLEANUP_DELAY);

                            cleanupTimeouts.set(key, timeout);
                        }
                    }
                }

                if (ws.instanceId) {
                    const instanceId = ws.instanceId;
                    const sessions = instanceSessions.get(instanceId);

                    if (sessions) {
                        sessions.delete(ws);

                        if (sessions.size === 0) {
                            instanceSessions.delete(instanceId);
                            const key = `instance:${instanceId}`;

                            if (cleanupTimeouts.has(key)) clearTimeout(cleanupTimeouts.get(key));
                            const timeout = setTimeout(() => {
                                unloadServerConfig('instance', instanceId);
                                cleanupTimeouts.delete(key);
                            }, APP_CONSTANTS.INSTANCE_CLEANUP_DELAY);

                            cleanupTimeouts.set(key, timeout);
                        }
                    }
                }
            } catch (e) {
                console.error("[Socket] Close Error:", e);
            }
        });
    });

    setInterval(() => {
        wss.clients.forEach((client) => {
            const ws = client as ActivityWebSocket;
            if (ws.readyState !== 1) return;
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, APP_CONSTANTS.WS_PING_INTERVAL);

    return wss;
};
