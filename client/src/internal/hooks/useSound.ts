import { useCallback } from 'react';
import { APP_CONSTANTS } from '@activity/shared';
import { SOUNDS, type SoundType } from '../../assets';
import { useConfig } from './useConfig.ts';

const pool: HTMLAudioElement[] = [];

export const useSound = (key: SoundType) => {
    const url = SOUNDS[key];
    const masterVolume = useConfig(s => s.volume.master);

    const play = useCallback(() => {
        const absoluteUrl = new URL(url, window.location.href).href;
        let audio = pool.find(a => a.paused && a.src === absoluteUrl);
        
        if (!audio) {
            if (pool.length < APP_CONSTANTS.MAX_SOUND_POOL_SIZE) {
                audio = new Audio(absoluteUrl);
                pool.push(audio);
            } else {
                audio = pool.find(a => a.paused);
            }
        }

        if (!audio) return;
        
        audio.volume = masterVolume;
        audio.currentTime = 0;
        if (audio.src === absoluteUrl && audio.readyState >= 3) {
            audio.play().catch(() => {});
        } else {
            audio.src = absoluteUrl;
            audio.oncanplaythrough = () => {
                audio.play().catch(() => {});
                audio.oncanplaythrough = null;
            };
            audio.load();
        }
    }, [url, masterVolume]);

    return { play };
};
