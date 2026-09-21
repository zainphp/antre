import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded';
import DevicesOtherRounded from '@mui/icons-material/DevicesOtherRounded';
import SyncRounded from '@mui/icons-material/SyncRounded';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Head, router, usePoll } from '@inertiajs/react';
import { useEffect } from 'react';

import { AppShell } from '@/components/app-shell';
import { InertiaButton } from '@/components/inertia-button';
import { display, home, operatorTerminal, queueTerminal } from '@/routes';
import admin from '@/routes/admin';
import type { Device } from '@/types/device';

export default function Pair({ device }: { device: Device }) {
    usePoll(2500, { only: ['device'] }, { mode: 'rest' });

    useEffect(() => {
        if (device.status === 'REGISTERED' && device.roles.length > 0) {
            if (device.roles.includes('OPERATOR_TERMINAL')) {
                router.visit(operatorTerminal.url());
            } else if (device.roles.includes('QUEUE_TERMINAL')) {
                router.visit(queueTerminal.url());
            } else {
                router.visit(display.url());
            }
        }
    }, [device.roles, device.status]);

    return (
        <AppShell>
            <Head title="Pendaftaran Perangkat" />
            <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
                <Card>
                    <CardContent
                        sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}
                    >
                        <Box className="role-icon" sx={{ mx: 'auto' }}>
                            <DevicesOtherRounded />
                        </Box>
                        <Typography className="eyebrow" sx={{ mt: 3 }}>
                            Registrasi perangkat
                        </Typography>
                        <Typography variant="h3" component="h1" sx={{ mt: 1 }}>
                            Menunggu administrator
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                            Biarkan halaman ini terbuka. Setelah perangkat
                            diberi peran, halaman akan berpindah otomatis.
                        </Typography>
                        <Box className="pairing-code-panel" sx={{ mt: 4 }}>
                            <Typography color="text.secondary">
                                ID perangkat
                            </Typography>
                            <Typography className="pairing-code-value">
                                {device.label}
                            </Typography>
                        </Box>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.25}
                            sx={{ justifyContent: 'center', mt: 3 }}
                        >
                            <InertiaButton
                                href={admin.devices.url()}
                                variant="contained"
                                startIcon={<AdminPanelSettingsRounded />}
                            >
                                Kelola perangkat
                            </InertiaButton>
                            <InertiaButton
                                href={home.url()}
                                variant="outlined"
                                startIcon={<SyncRounded />}
                            >
                                Beranda publik
                            </InertiaButton>
                        </Stack>
                    </CardContent>
                </Card>
            </Container>
        </AppShell>
    );
}
