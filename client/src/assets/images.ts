
export const IMAGES = {
    FAVICON: '/favicon.png',
} as const;

// noinspection JSUnusedGlobalSymbols
export type ImageType = keyof typeof IMAGES;
