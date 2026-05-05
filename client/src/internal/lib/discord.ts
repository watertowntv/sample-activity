import { DiscordSDK } from '@discord/embedded-app-sdk';

export const VITE_DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;


export const discordSdk = typeof window !== 'undefined' && 
    (window.location.search.includes('frame_id') || window.navigator.userAgent.includes('Discord'))
    ? new DiscordSDK(VITE_DISCORD_CLIENT_ID)
    : null;
