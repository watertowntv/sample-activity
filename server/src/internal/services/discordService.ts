import { type DiscordUser } from "@activity/shared";

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

/**
 * Discord API
 */
export const requestDiscordToken = async (code: string): Promise<TokenResponse> => {
    const params = new URLSearchParams({
        client_id: process.env.VITE_DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
    });

    if (process.env.DISCORD_REDIRECT_URI) {
        params.append('redirect_uri', process.env.DISCORD_REDIRECT_URI);
    }

    const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("[Discord API Error Body]:", errorBody);
        throw new Error(`Token Fail: ${response.statusText} (${errorBody})`);
    }
    return await response.json() as TokenResponse;
};

export const requestDiscordUser = async (accessToken: string): Promise<DiscordUser> => {
    const response = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error(`User Fail: ${response.statusText}`);
    return await response.json() as DiscordUser;
}
