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
import type { ReactElement } from 'react';

import { AdminLayout } from '@/components/admin-layout';
import type { ConnectionState } from '@/components/connection-badge';
import { ConnectionBadge } from '@/components/connection-badge';
import { useIntegrationProbes } from '@/hooks/use-integration-probes';
import type { ProbeState } from '@/hooks/use-integration-probes';

export default function Integrations({
    sentryBackendConfigured,
    broadcastConnection,
}: {
    sentryBackendConfigured: boolean;
    broadcastConnection: string | null;
}) {
    const {
        backendSentry,
        frontendSentry,
        broadcast,
        testBackendSentry,
        testFrontendSentry,
        testBroadcast,
    } = useIntegrationProbes(sentryBackendConfigured);

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
