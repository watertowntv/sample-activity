import { useDiscord } from '../internal/context/DiscordContext.ts';
import { getAvatarUrl, getName, isBrowser } from "../utils/utils.ts";
import { MessageType } from "@activity/shared";
import { useConfig } from "../internal/hooks/useConfig.ts";
import { useSound } from "../internal/hooks/useSound.ts";


const CountScene = () => {
    const { user, participants, send, status } = useDiscord();
    const browser = isBrowser(status);

    // Config ====================================================
    const count = useConfig(config => config.count);

    // Sound =====================================================
    const { play: playPing } = useSound('PING');

    // Send Message ==============================================
    const handlePing = () => {
        playPing();

        send({
            type: MessageType.CLIENT_MESSAGE,
            payload: { name: browser ? "Browser" : "Discord" }
        });
    };

    const avatarUrl = getAvatarUrl(user);
    const names = participants.length > 0 ? participants.map(getName).join(', ') : 'None';
    const displayName = user?.global_name || user?.username || 'Unknown';


    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-200">
            <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-3xl shadow-2xl border border-zinc-100">
                <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-indigo-600 object-cover shadow-lg" />
                
                <div className="text-center">
                    <p className="text-zinc-900 font-black text-3xl">{displayName}</p>
                </div>

                <div className="flex flex-col items-center gap-4 w-full">
                    <button 
                        onClick={handlePing}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-md w-full"
                    >
                        Click
                    </button>

                    <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm font-mono border border-green-100 animate-pulse">
                        Current Count: {count}
                    </div>
                </div>

                <p className="text-zinc-400 text-[10px] font-medium max-w-50 text-center leading-tight">
                    <span className="text-zinc-500 font-bold">Participants:</span> {names}
                </p>
            </div>
        </main>
    );
};

export default CountScene;
