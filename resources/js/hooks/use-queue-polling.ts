import { usePoll } from '@inertiajs/react';
import { useEffect } from 'react';

export function useQueuePolling(enabled: boolean, interval = 30000): void {
    const { start, stop } = usePoll(
        interval,
        { only: ['state'] },
        {
            autoStart: enabled,
            mode: 'rest',
        },
    );

    useEffect(() => {
        if (enabled) {
            start();
        } else {
            stop();
        }
    }, [enabled, start, stop]);
}
