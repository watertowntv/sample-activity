import { useDiscord } from './internal/context/DiscordContext.ts';
import { LoadingScene } from './internal/scenes/LoadingScene.tsx';
import { ErrorScene } from "./internal/scenes/ErrorScene.tsx";
import { lazy, Suspense } from "react";
import { useAssetLoader } from "./internal/hooks/useAssetLoader.ts";
import { ASSETS_TO_LOAD } from "./assets";

const MainScene = lazy(() => import('./scenes/MainScene.tsx'));

export default function App() {
    const { status, isAuthorized, isConnected, error } = useDiscord();
    const { isLoaded, progress, isError } = useAssetLoader(ASSETS_TO_LOAD);

    if (import.meta.env.PROD && status === 'Browser') {
        return <div className="min-h-screen bg-white" />;
    }

    if (status === 'Error' || error || isError) return <ErrorScene />;

    const isReady = isAuthorized && isLoaded;
    if (!isReady) return <LoadingScene progress={progress} />;

    return (
        <>
            <Suspense fallback={<LoadingScene progress={100} />}>
                <MainScene />
            </Suspense>
            {!isConnected && isAuthorized && (
                <div className="fixed top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-bold animate-pulse z-50">
                    Reconnecting...
                </div>
            )}
        </>
    );
}
