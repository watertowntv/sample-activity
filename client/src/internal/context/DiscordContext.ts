import { createContext, useContext } from 'react';
import type { DiscordUser, AuthStatus, Participant, GlobalSocketMessage } from '@activity/shared';


export interface DiscordContextType {
    user: DiscordUser | null;
    status: AuthStatus;
    participants: Participant[];
    instanceId: string | null;
    code: string | null;
    error: string | null;
    isAuthorized: boolean;
    isConnected: boolean;
    send: (data: GlobalSocketMessage) => void;
}

export const DiscordContext = createContext<DiscordContextType | undefined>(undefined);

export const useDiscord = (): DiscordContextType => {
    const context = useContext(DiscordContext);
    if (!context) throw new Error("Context Error");

    return context;
};
