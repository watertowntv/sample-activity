import React, { useEffect, useState, useRef, useCallback } from 'react';
import { discordSdk, VITE_DISCORD_CLIENT_ID } from '../lib/discord.ts';
import { DiscordContext } from './DiscordContext.ts';
import { useSocket } from '../hooks/useSocket.ts';
import { MainHandler } from '../../handler/MainHandler.ts';
import {
    MessageType,
    type GlobalSocketMessage,
    type DiscordUser,
    type AuthStatus,
    type Participant,
    APP_CONSTANTS
} from '@activity/shared';


export const DiscordProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<DiscordUser | null>(null);
    const [status, setStatus] = useState<AuthStatus>('Initializing');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [instanceId, setInstanceId] = useState<string | null>(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const authStarted = useRef(false);
    const connectionSent = useRef(false);
    const authResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const participantsHandlerRef = useRef<(({ participants }: { participants: Participant[] }) => void) | null>(null);

    const handleMessage = useCallback((msg: GlobalSocketMessage, sendFunc: (data: GlobalSocketMessage) => void) => {
        MainHandler(msg);

        if (msg.type === MessageType.INIT) {
            setUser(msg.payload.user);
            setIsAuthorized(true);

            if (!connectionSent.current) {
                const { accessToken } = msg.payload;
                connectionSent.current = true;
                
                sendFunc({ type: MessageType.CLIENT_CONNECTION, payload: {} });

                const sdk = discordSdk;
                if (sdk) {
                    sdk.commands.authenticate({ access_token: accessToken }).then(async () => {
                        if (participantsHandlerRef.current) {
                            await sdk.unsubscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', participantsHandlerRef.current).catch(() => {});
                        }
                        
                        participantsHandlerRef.current = ({ participants: p }: { participants: Participant[] }) => setParticipants(p);
                        await sdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', participantsHandlerRef.current);
                        
                        const { participants: list } = await sdk.commands.getInstanceConnectedParticipants();
                        setParticipants(list);
                    }).catch(console.error);
                }
            }
        } else if (msg.type === MessageType.ERROR) {
            setError(msg.payload.message);
            setStatus('Error');
        }
    }, []);

    const { isConnected, send } = useSocket<GlobalSocketMessage>(
        `${protocol}://${location.host}/api`, 
        handleMessage
    );

    useEffect(() => {
        if (!isConnected) {
            authStarted.current = false;
            connectionSent.current = false;

            if (!authResetRef.current) authResetRef.current = setTimeout(() => {
                setIsAuthorized(false);
                authResetRef.current = null;
            }, APP_CONSTANTS.AUTH_GRACE_PERIOD);

            return () => {
                if (authResetRef.current) {
                    clearTimeout(authResetRef.current);

                    authResetRef.current = null;
                }
            };
        }
        
        if (authResetRef.current) {
            clearTimeout(authResetRef.current);
            authResetRef.current = null;
        }
    }, [isConnected]);

    useEffect(() => {
        const setup = async () => {
            try {
                if (!discordSdk) {
                    setStatus('Browser');
                    setInstanceId('browser-instance');
                    return;
                }

                await discordSdk.ready();

                setInstanceId(discordSdk.instanceId);
                setStatus('Ready');
            } catch (e) {
                setError(e instanceof Error ? e.message : 'SDK Error');
                setStatus('Error');
            }
        };
        setup().catch(() => {});
    }, []);

    useEffect(() => {
        if (!isConnected || !instanceId || authStarted.current) return;
        authStarted.current = true;

        const performAuth = async () => {
            try {
                if (status === 'Browser') {
                    send({ type: MessageType.AUTH, payload: { code: 'browser', instanceId } });
                    return;
                }

                const { code } = await discordSdk!.commands.authorize({
                    client_id: VITE_DISCORD_CLIENT_ID,
                    response_type: 'code',
                    scope: ['identify', 'guilds'],
                    prompt: 'none'
                });

                if (code) send({ type: MessageType.AUTH, payload: { code, instanceId } });
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Authorization Failed');
                setStatus('Error');
                authStarted.current = false;
            }
        };

        performAuth().catch(() => {});
    }, [isConnected, instanceId, status, send]);

    return (
        <DiscordContext.Provider value={{ user, status, participants, instanceId, code: null, error, isAuthorized, isConnected, send }}>
            {children}
        </DiscordContext.Provider>
    );
};
