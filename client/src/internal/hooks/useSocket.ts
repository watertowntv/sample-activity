import { useEffect, useState, useCallback, useRef } from 'react';
import { GlobalSocketMessageSchema } from "@activity/shared";


export const useSocket = <T>(url: string, onMessage?: (data: T, send: (data: T) => void) => void) => {
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const reconnectAttemptsRef = useRef(0);

    const onMessageRef = useRef(onMessage);
    useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

    const send = useCallback((data: T) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(data));
            return;
        }
        console.warn("[Socket] Cannot send, not open");
    }, []);

    const connectRef = useRef<() => void>(() => {});
    const connect = useCallback(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) return;
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
            setIsConnected(true);
            reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
            try {
                const json = JSON.parse(event.data);
                const result = GlobalSocketMessageSchema.safeParse(json);

                if (result.success) onMessageRef.current?.(result.data as T, send);
            } catch (e) {
                console.error("[Socket] Parse error", e);
            }
        };

        ws.onclose = (e) => {
            setIsConnected(false);
            if (e.code === 1000) return;
            
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
            reconnectTimeoutRef.current = setTimeout(() => {
                reconnectAttemptsRef.current = Math.min(reconnectAttemptsRef.current + 1, 10);

                connectRef.current();
            }, delay);
        };

        ws.onerror = (e) => console.error("[Socket] Error:", e);
        socketRef.current = ws;
    }, [url, send]);

    useEffect(() => {
        connectRef.current = connect;
        connect();
        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

            if (socketRef.current) {
                socketRef.current.onclose = null;
                socketRef.current.close(1000);
            }
        };
    }, [connect]);

    return { isConnected, send };
};
