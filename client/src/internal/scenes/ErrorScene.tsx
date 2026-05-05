export const ErrorScene = () => {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#1a1b26] p-6 flex-col gap-4">
            <h1 style={{ color: '#ffffff', fontSize: '64px' }} className="font-black tracking-tighter italic">
                Error!
            </h1>
            <p style={{ color: '#818cf8', fontSize: '18px' }} className="font-bold">
                Please reload the page.
            </p>
        </main>
    );
};
