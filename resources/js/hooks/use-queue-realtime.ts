import { useEffect, useState } from 'react';

import type { ConnectionState } from '@/components/connection-badge';
import { useQueuePolling } from '@/hooks/use-queue-polling';
import echo from '@/services/echo';
import type { QueueState } from '@/types/queue';

type QueueChangedPayload = { state: QueueState };

export function useQueueRealtime(initialState: QueueState): {
    state: QueueState;
    connection: ConnectionState;
} {
    useQueuePolling();
    const [state, setState] = useState(initialState);
    const [connection, setConnection] = useState<ConnectionState>(() =>
        mapConnection(echo.connectionStatus()),
    );

    useEffect(() => setState(initialState), [initialState]);

    useEffect(() => {
        const channel = echo.channel('queue');
        channel.listen('.queue.changed', (payload: QueueChangedPayload) =>
            setState(payload.state),
        );
        const stopWatching = echo.connector.onConnectionChange((status) =>
            setConnection(mapConnection(status)),
        );
        setConnection(mapConnection(echo.connectionStatus()));

        return () => {
            channel.stopListening('.queue.changed');
            echo.leave('queue');
            stopWatching();
        };
    }, []);

    return { state, connection };
}

function mapConnection(status: string): ConnectionState {
    if (status === 'connected') return 'CONNECTED';
    if (status === 'failed') return 'FAILED';
    if (status === 'connecting' || status === 'reconnecting')
        return 'RECONNECTING';
    return 'DISCONNECTED';
}
