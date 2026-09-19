import { usePoll } from '@inertiajs/react';

export function useQueuePolling(): void {
    usePoll(3000, { only: ['state'] }, { keepAlive: true });
}
