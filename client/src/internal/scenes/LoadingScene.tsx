export const LoadingScene = ({ progress }: { progress?: number }) => {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#1a1b26] flex-col gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            {progress !== undefined && <p className="text-indigo-400 font-mono text-sm">{progress}%</p>}
        </main>
    );
};
