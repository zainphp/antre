import BugReportRounded from '@mui/icons-material/BugReportRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CloudRounded from '@mui/icons-material/CloudRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import HubRounded from '@mui/icons-material/HubRounded';
import MonitorHeartRounded from '@mui/icons-material/MonitorHeartRounded';
import RouterRounded from '@mui/icons-material/RouterRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Head } from '@inertiajs/react';
import * as Sentry from '@sentry/react';
import {
    useEffect,
    useRef,
    useState,
    type MutableRefObject,
    type ReactElement,
} from 'react';

import { AdminLayout } from '@/components/admin-layout';
import type { ConnectionState } from '@/components/connection-badge';
import { ConnectionBadge } from '@/components/connection-badge';
import admin from '@/routes/admin';
import echo, {
    activeBroadcastConnection,
    createEcho,
    type BroadcastConnection,
} from '@/services/echo';

type ProbeStatus = 'idle' | 'testing' | 'passed' | 'failed';

type ProbeState = {
    configured: boolean;
    status: ProbeStatus;
    message?: string;
};

type BroadcastProbeState = ProbeState & {
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

export default function Integrations({
    sentryBackendConfigured,
    broadcastConnection,
}: {
    sentryBackendConfigured: boolean;
    broadcastConnection: string | null;
}) {
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

    return (
        <AdminLayout>
            <Head title="Integrasi" />
            <Container maxWidth="lg" className="admin-page">
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    sx={{
                        justifyContent: 'space-between',
                        alignItems: {
                            xs: 'flex-start',
                            sm: 'flex-end',
                        },
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography className="eyebrow">
                            Administrator
                        </Typography>
                        <Typography
                            variant="h3"
                            component="h1"
                            sx={{ mt: 0.75 }}
                        >
                            Uji integrasi
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            Pastikan pemantauan error dan koneksi realtime siap
                            digunakan.
                        </Typography>
                    </Box>
                    <Chip
                        icon={<MonitorHeartRounded />}
                        label={
                            broadcastConnection
                                ? `Aktif: ${broadcastConnection}`
                                : 'Realtime belum dipilih'
                        }
                        color={broadcastConnection ? 'success' : 'warning'}
                        variant="outlined"
                    />
                </Stack>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            md: 'repeat(2, minmax(0, 1fr))',
                        },
                        gap: 2.5,
                        mt: 4,
                    }}
                >
                    <IntegrationCard
                        icon={<BugReportRounded />}
                        title="Sentry backend"
                        description="Kirim pesan uji dari Laravel ke proyek Sentry backend."
                        state={backendSentry}
                        onTest={testBackendSentry}
                    />
                    <IntegrationCard
                        icon={<MonitorHeartRounded />}
                        title="Sentry frontend"
                        description="Kirim pesan uji dari browser melalui Sentry React."
                        state={frontendSentry}
                        onTest={testFrontendSentry}
                    />
                    <IntegrationCard
                        icon={<CloudRounded />}
                        title="Ably"
                        description="Kirim event privat melalui Ably dan tunggu sampai browser menerimanya."
                        state={broadcast.ably}
                        onTest={() => testBroadcast('ably')}
                        connection={broadcast.ably.connection}
                    />
                    <IntegrationCard
                        icon={<RouterRounded />}
                        title="Reverb"
                        description="Kirim event privat melalui Reverb dan tunggu sampai browser menerimanya."
                        state={broadcast.reverb}
                        onTest={() => testBroadcast('reverb')}
                        connection={broadcast.reverb.connection}
                    />
                </Box>

                <Alert severity="info" icon={<HubRounded />} sx={{ mt: 3 }}>
                    Uji Ably dan Reverb membutuhkan kunci frontend dan server
                    yang sesuai. Event hanya dikirim ke channel administrator
                    dan tidak mengubah data antrian.
                </Alert>
            </Container>
        </AdminLayout>
    );
}

function IntegrationCard({
    icon,
    title,
    description,
    state,
    connection,
    onTest,
}: {
    icon: ReactElement;
    title: string;
    description: string;
    state: ProbeState;
    connection?: ConnectionState;
    onTest: () => Promise<void>;
}) {
    const testing = state.status === 'testing';

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent
                sx={{
                    p: { xs: 3, md: 4 },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Stack
                    direction="row"
                    sx={{ alignItems: 'flex-start', gap: 2 }}
                >
                    <Box className="role-icon">{icon}</Box>
                    <Box>
                        <Typography component="h2" variant="h6">
                            {title}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                            {description}
                        </Typography>
                    </Box>
                </Stack>

                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    sx={{
                        mt: 'auto',
                        pt: 3,
                        alignItems: {
                            xs: 'flex-start',
                            sm: 'center',
                        },
                        gap: 1,
                    }}
                >
                    <ProbeStatus state={state} />
                    {connection && <ConnectionBadge state={connection} />}
                </Stack>

                {state.message && (
                    <Typography
                        color="text.secondary"
                        variant="body2"
                        sx={{ mt: 1.5 }}
                    >
                        {state.message}
                    </Typography>
                )}

                <Button
                    fullWidth
                    variant="contained"
                    disabled={!state.configured || testing}
                    onClick={() => void onTest()}
                    startIcon={
                        testing ? (
                            <CircularProgress color="inherit" size={18} />
                        ) : undefined
                    }
                    sx={{ mt: 2.5 }}
                >
                    {testing ? 'Menguji...' : 'Jalankan uji'}
                </Button>
            </CardContent>
        </Card>
    );
}

function ProbeStatus({ state }: { state: ProbeState }) {
    if (!state.configured) {
        return <Chip size="small" label="Belum dikonfigurasi" />;
    }

    if (state.status === 'testing') {
        return <Chip size="small" color="warning" label="Menguji" />;
    }

    if (state.status === 'passed') {
        return (
            <Chip
                size="small"
                color="success"
                icon={<CheckCircleRounded />}
                label="Berhasil"
            />
        );
    }

    if (state.status === 'failed') {
        return (
            <Chip
                size="small"
                color="error"
                icon={<ErrorOutlineRounded />}
                label="Gagal"
            />
        );
    }

    return <Chip size="small" variant="outlined" label="Siap diuji" />;
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
    if (status === 'connected') return 'CONNECTED';
    if (status === 'failed') return 'FAILED';
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
