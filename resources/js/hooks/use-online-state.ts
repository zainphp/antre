import { useEffect, useState } from 'react';

export function useOnlineState(): boolean {
    const [online, setOnline] = useState(() => navigator.onLine);

    useEffect(() => {
        const setOnlineState = () => setOnline(navigator.onLine);
        window.addEventListener('online', setOnlineState);
        window.addEventListener('offline', setOnlineState);
        return () => {
            window.removeEventListener('online', setOnlineState);
            window.removeEventListener('offline', setOnlineState);
        };
    }, []);

    return online;
}
