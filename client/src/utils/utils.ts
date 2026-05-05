import type { DiscordUser, Participant } from "@activity/shared";


export const getAvatarUrl = (user: DiscordUser | null, size: number = 128) => {
    if (!user || !user.id) return `https://cdn.discordapp.com/embed/avatars/0.png`;

    if (!user.avatar) {
        let defaultAvatarIndex = 0;
        try {
            defaultAvatarIndex = Number(BigInt(user.id) >> 22n) % 6;
        } catch (e) {
            defaultAvatarIndex = 0;
        }
        return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
    }

    const isAnimated = user.avatar.startsWith('a_');
    const format = isAnimated ? 'gif' : 'webp';

    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}?size=${size}`;
};

export const getName = (p: Participant) => p.global_name ?? p.username;

export const isBrowser = (status: string) => status === 'Browser';
