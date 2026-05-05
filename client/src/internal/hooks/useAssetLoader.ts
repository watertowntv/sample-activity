import { useState, useEffect } from 'react';

export const useAssetLoader = (assetUrls: string[]) => {
    const [prevUrls, setPrevUrls] = useState(assetUrls);
    const [progress, setProgress] = useState(assetUrls.length === 0 ? 100 : 0);
    const [isLoaded, setIsLoaded] = useState(assetUrls.length === 0);
    const [isError, setIsError] = useState(false);

    if (assetUrls !== prevUrls) {
        setPrevUrls(assetUrls);
        setProgress(assetUrls.length === 0 ? 100 : 0);
        setIsLoaded(assetUrls.length === 0);
        setIsError(false);
    }

    useEffect(() => {
        const total = assetUrls.length;
        if (total === 0) return;

        let active = true;
        let loadedCount = 0;

        const handleLoad = (success: boolean) => {
            if (!active) return;
            if (!success) setIsError(true);
            
            loadedCount++;
            const currentProgress = Math.round((loadedCount / total) * 100);
            setProgress(currentProgress);
            
            if (loadedCount === total) setIsLoaded(true);
        };

        const elements = assetUrls.map(url => {
            const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(url);
            const el = isAudio ? new Audio() : new Image();
            
            if (isAudio) {
                const audio = el as HTMLAudioElement;
                audio.oncanplay = () => handleLoad(true);
                audio.onerror = () => handleLoad(false);
                audio.load();
            } else {
                const img = el as HTMLImageElement;
                img.onload = () => handleLoad(true);
                img.onerror = () => handleLoad(false);
            }
            
            el.src = url;
            return el;
        });

        return () => {
            active = false;
            elements.forEach(el => {
                if (el instanceof HTMLAudioElement) el.oncanplay = null;
                else el.onload = null;
                el.onerror = null;
            });
        };
    }, [assetUrls]);

    return { isLoaded, progress, isError };
};
