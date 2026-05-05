import { SOUNDS } from './sounds.ts';
import { IMAGES } from './images.ts';

export * from './sounds.ts';
export * from './images.ts';

export const ASSETS_TO_LOAD = [
    ...Object.values(SOUNDS),
    ...Object.values(IMAGES),
];
