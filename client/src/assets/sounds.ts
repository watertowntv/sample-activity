export const SOUNDS = {
    PING: '/ping.mp3',
} as const;

export type SoundType = keyof typeof SOUNDS;
