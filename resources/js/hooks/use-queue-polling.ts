import { usePoll } from '@inertiajs/react';
import { useEffect } from 'react';

export function useQueuePolling(enabled: boolean): void {
    const { start, stop } = usePoll(
        30000,
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
