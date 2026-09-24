import * as Sentry from '@sentry/react';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';

import type { ConnectionState } from '@/components/connection-badge';
import admin from '@/routes/admin';
import echo, {
    activeBroadcastConnection,
    createEcho,
    type BroadcastConnection,
} from '@/services/echo';

export type ProbeStatus = 'idle' | 'testing' | 'passed' | 'failed';

export type ProbeState = {
    configured: boolean;
    status: ProbeStatus;
    message?: string;
};

export type BroadcastProbeState = ProbeState & {
    connection: ConnectionState;
};

type IntegrationEvent = {
    connection: string;
};

const broadcastConnections: BroadcastConnection[] = ['ably', 'reverb'];
const frontendSentryConfigured = Boolean(import.meta.env.VITE_SENTRY_DSN);
const clientConfigured: Record<BroadcastConnection, boolean> = {
    ably: Boolean(import.meta.env.VITE_ABLY_PUBLIC_KEY),
    reverb: Boolean(import.meta.env.VITE_REVERB_APP_KEY),
};

export function useIntegrationProbes(sentryBackendConfigured: boolean): {
    backendSentry: ProbeState;
    frontendSentry: ProbeState;
    broadcast: Record<BroadcastConnection, BroadcastProbeState>;
    testBackendSentry: () => Promise<void>;
    testFrontendSentry: () => Promise<void>;
    testBroadcast: (connection: BroadcastConnection) => Promise<void>;
} {
    const [backendSentry, setBackendSentry] = useState<ProbeState>(() =>
        createProbeState(sentryBackendConfigured),
    );
    const [frontendSentry, setFrontendSentry] = useState<ProbeState>(() =>
        createProbeState(frontendSentryConfigured),
    );
    const [broadcast, setBroadcast] = useState<
        Record<BroadcastConnection, BroadcastProbeState>
    >(() => ({
        ably: createBroadcastProbeState(clientConfigured.ably),
        reverb: createBroadcastProbeState(clientConfigured.reverb),
    }));
    const pendingBroadcast = useRef<Set<BroadcastConnection>>(new Set());
    const broadcastTimers = useRef<Map<BroadcastConnection, number>>(new Map());

    useEffect(() => {
        const clients: Array<{
            connection: BroadcastConnection;
            client: ReturnType<typeof createEcho>;
            ownsClient: boolean;
            stopWatching: () => void;
        }> = [];

        for (const connection of broadcastConnections) {
            if (!clientConfigured[connection]) {
                continue;
            }

            try {
                const ownsClient = connection !== activeBroadcastConnection;
                const client = ownsClient ? createEcho(connection) : echo;
                const channel = client.private('admin.integrations');
                const handleEvent = (payload: IntegrationEvent): void => {
                    if (
                        payload.connection !== connection ||
                        !pendingBroadcast.current.has(connection)
                    ) {
                        return;
                    }

                    pendingBroadcast.current.delete(connection);
                    clearBroadcastTimer(connection, broadcastTimers);
                    setBroadcast((current) => ({
                        ...current,
                        [connection]: {
                            ...current[connection],
                            status: 'passed',
                            message: `Event ${connection} diterima oleh browser.`,
                        },
                    }));
                };

                channel.listen('.integration.tested', handleEvent);
                channel.error(() => {
                    setBroadcast((current) => ({
                        ...current,
                        [connection]: {
                            ...current[connection],
                            connection: 'FAILED',
                            status: 'failed',
                            message: `Channel admin ${connection} tidak dapat diakses.`,
                        },
                    }));
                });

                const stopWatching = client.connector.onConnectionChange(
                    (status) => {
                        setBroadcast((current) => ({
                            ...current,
                            [connection]: {
                                ...current[connection],
                                connection: mapConnection(status),
                            },
                        }));
                    },
                );

                setBroadcast((current) => ({
                    ...current,
                    [connection]: {
                        ...current[connection],
                        connection: mapConnection(client.connectionStatus()),
                    },
                }));

                clients.push({ connection, client, ownsClient, stopWatching });
            } catch (error) {
                setBroadcast((current) => ({
                    ...current,
                    [connection]: {
                        ...current[connection],
                        connection: 'FAILED',
                        status: 'failed',
                        message: errorMessage(error),
                    },
                }));
            }
        }

        return () => {
            for (const connection of broadcastConnections) {
                pendingBroadcast.current.delete(connection);
                clearBroadcastTimer(connection, broadcastTimers);
            }

            for (const { client, ownsClient, stopWatching } of clients) {
                stopWatching();
                client.leave('admin.integrations');
                if (ownsClient) {
                    client.disconnect();
                }
            }
        };
    }, []);

    const testBackendSentry = async (): Promise<void> => {
        setBackendSentry((current) => ({ ...current, status: 'testing' }));

        try {
            const response = await postJson(
                admin.integrations.sentry.backend.url(),
            );
            setBackendSentry({
                configured: true,
                status: 'passed',
                message: response.message ?? 'Pesan uji berhasil dikirim.',
            });
        } catch (error) {
            setBackendSentry((current) => ({
                ...current,
                status: 'failed',
                message: errorMessage(error),
            }));
        }
    };

    const testFrontendSentry = async (): Promise<void> => {
        setFrontendSentry((current) => ({ ...current, status: 'testing' }));

        try {
            Sentry.captureMessage('Antre integration test: frontend Sentry');
            const flushed = await Sentry.flush(2000);

            setFrontendSentry({
                configured: true,
                status: 'passed',
                message: flushed
                    ? 'Pesan uji frontend Sentry telah dikirim.'
                    : 'Pesan uji sudah masuk antrean Sentry.',
            });
        } catch (error) {
            setFrontendSentry((current) => ({
                ...current,
                status: 'failed',
                message: errorMessage(error),
            }));
        }
    };

    const testBroadcast = async (
        connection: BroadcastConnection,
    ): Promise<void> => {
        clearBroadcastTimer(connection, broadcastTimers);
        pendingBroadcast.current.add(connection);
        setBroadcast((current) => ({
            ...current,
            [connection]: {
                ...current[connection],
                status: 'testing',
                message: 'Menunggu event diterima browser...',
            },
        }));

        try {
            await postJson(admin.integrations.broadcast.url(connection));

            if (!pendingBroadcast.current.has(connection)) {
                return;
            }

            const timer = window.setTimeout(() => {
                if (!pendingBroadcast.current.has(connection)) {
                    return;
                }

                pendingBroadcast.current.delete(connection);
                broadcastTimers.current.delete(connection);
                setBroadcast((current) => ({
                    ...current,
                    [connection]: {
                        ...current[connection],
                        status: 'failed',
                        message:
                            'Event terkirim dari server, tetapi belum diterima browser.',
                    },
                }));
            }, 8000);

            broadcastTimers.current.set(connection, timer);
        } catch (error) {
            pendingBroadcast.current.delete(connection);
            setBroadcast((current) => ({
                ...current,
                [connection]: {
                    ...current[connection],
                    status: 'failed',
                    message: errorMessage(error),
                },
            }));
        }
    };

    return {
        backendSentry,
        frontendSentry,
        broadcast,
        testBackendSentry,
        testFrontendSentry,
        testBroadcast,
    };
}

function createProbeState(configured: boolean): ProbeState {
    return {
        configured,
        status: 'idle',
        message: configured
            ? undefined
            : 'Konfigurasi layanan belum tersedia di environment.',
    };
}

function createBroadcastProbeState(configured: boolean): BroadcastProbeState {
    return {
        ...createProbeState(configured),
        connection: configured ? 'DISCONNECTED' : 'FAILED',
    };
}

function mapConnection(status: string): ConnectionState {
    if (status === 'connected') {
        return 'CONNECTED';
    }

    if (status === 'failed') {
        return 'FAILED';
    }

    if (status === 'connecting' || status === 'reconnecting') {
        return 'RECONNECTING';
    }

    return 'DISCONNECTED';
}

function clearBroadcastTimer(
    connection: BroadcastConnection,
    timers: MutableRefObject<Map<BroadcastConnection, number>>,
): void {
    const timer = timers.current.get(connection);
    if (timer === undefined) {
        return;
    }

    window.clearTimeout(timer);
    timers.current.delete(connection);
}

async function postJson(url: string): Promise<{ message?: string }> {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
    });
    const payload = (await response.json().catch(() => null)) as {
        message?: unknown;
    } | null;

    if (!response.ok) {
        throw new Error(
            typeof payload?.message === 'string'
                ? payload.message
                : 'Permintaan uji gagal diproses.',
        );
    }

    return {
        message:
            typeof payload?.message === 'string' ? payload.message : undefined,
    };
}

function csrfToken(): string {
    return (
        document
            .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
    );
}

function errorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : 'Permintaan uji gagal diproses.';
}
