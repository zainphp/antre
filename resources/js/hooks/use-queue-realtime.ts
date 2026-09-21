import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import type { ConnectionState } from '@/components/connection-badge';
import { useQueuePolling } from '@/hooks/use-queue-polling';
import echo from '@/services/echo';
import type { QueueState } from '@/types/queue';

type QueueChangedPayload = { state: QueueState };

export function useQueueRealtime(
    initialState: QueueState,
    { refreshOnEvent = false }: { refreshOnEvent?: boolean } = {},
): {
    state: QueueState;
    connection: ConnectionState;
} {
    const [state, setState] = useState(initialState);
    const [connection, setConnection] = useState<ConnectionState>(() =>
        mapConnection(echo.connectionStatus()),
    );
    const previousConnection = useRef<ConnectionState | null>(null);

    useQueuePolling(true, connection === 'CONNECTED' ? 60000 : 30000);

    useEffect(() => setState(initialState), [initialState]);

    useEffect(() => {
        const wasDisconnected =
            previousConnection.current !== null &&
            previousConnection.current !== 'CONNECTED';

        if (connection === 'CONNECTED' && wasDisconnected) {
            router.reload();
        }

        previousConnection.current = connection;
    }, [connection]);

    useEffect(() => {
        const channel = echo.channel('queue');
        channel.listen('.queue.changed', (payload: QueueChangedPayload) => {
            if (refreshOnEvent) {
                router.reload({
                    only: ['state'],
                });

                return;
            }

            setState(payload.state);
        });
        channel.listen('.settings.changed', () => router.reload());
        const stopWatching = echo.connector.onConnectionChange((status) =>
            setConnection(mapConnection(status)),
        );
        setConnection(mapConnection(echo.connectionStatus()));

        return () => {
            channel.stopListening('.queue.changed');
            channel.stopListening('.settings.changed');
            echo.leave('queue');
            stopWatching();
        };
    }, [refreshOnEvent]);

    return { state, connection };
}

function mapConnection(status: string): ConnectionState {
    if (status === 'connected') return 'CONNECTED';
    if (status === 'failed') return 'FAILED';
    if (status === 'connecting' || status === 'reconnecting')
        return 'RECONNECTING';
    return 'DISCONNECTED';
}
