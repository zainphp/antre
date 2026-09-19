import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import DisplaySettingsRounded from '@mui/icons-material/DisplaySettingsRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import PointOfSaleRounded from '@mui/icons-material/PointOfSaleRounded';
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Container,
    Stack,
    Typography,
} from '@mui/material';

import { AppShell } from '@/components/app-shell';
import { ConnectionBadge } from '@/components/connection-badge';
import { InertiaButton } from '@/components/inertia-button';
import { SectionHeading } from '@/components/section-heading';
import { display, home, operator, pair, takeNumber } from '@/routes';
import { useQueueRealtime } from '@/hooks/use-queue-realtime';
import type { QueueState } from '@/types/queue';

export default function Welcome({ state }: { state: QueueState }) {
    const realtime = useQueueRealtime(state);
    state = realtime.state;

    return (
        <AppShell>
            <Box component="section" className="home-hero">
                <Container maxWidth="lg" className="home-hero-inner">
                    <Box className="hero-copy">
                        <Typography className="eyebrow hero-eyebrow">
                            Antrean layanan, lebih tertata
                        </Typography>
                        <Typography component="h1" className="hero-title">
                            Tunggu dengan tenang. Kami yang memanggil.
                        </Typography>
                        <Typography className="hero-detail">
                            Pantau antrian dari mana saja dan datang saat nomor
                            Anda mendekat. Satu sumber informasi untuk setiap
                            layar di lokasi layanan.
                        </Typography>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.25}
                            sx={{ mt: 4 }}
                        >
                            <InertiaButton
                                href={pair.url()}
                                variant="contained"
                                color="secondary"
                                endIcon={<ArrowForwardRounded />}
                            >
                                Hubungkan perangkat
                            </InertiaButton>
                            <InertiaButton
                                href={operator.url()}
                                variant="outlined"
                                color="inherit"
                            >
                                Masuk operator
                            </InertiaButton>
                        </Stack>
                    </Box>
                    <Box className="hero-number" aria-live="polite">
                        <Typography className="hero-number-label">
                            Sedang dipanggil
                        </Typography>
                        <Typography className="hero-number-value">
                            {state.current?.number ?? '— — —'}
                        </Typography>
                        <Box className="hero-number-rule" />
                        <Typography className="hero-number-note">
                            {state.current?.counter
                                ? `${state.current.counter}. Silakan menuju loket.`
                                : 'Belum ada nomor yang dipanggil.'}
                        </Typography>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
                <SectionHeading
                    eyebrow="Monitor publik"
                    title="Status antrian hari ini"
                    detail="Informasi ringkas yang aman dibuka dari ponsel, tanpa akses ke data pribadi."
                />
                <ConnectionBadge state={realtime.connection} />
                <Box className="public-monitor">
                    <Card className="public-current">
                        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                            <Typography className="eyebrow hero-eyebrow">
                                Nomor saat ini
                            </Typography>
                            <Typography className="public-current-number">
                                {state.current?.number ?? '— — —'}
                            </Typography>
                            <Typography className="public-current-counter">
                                {state.current?.counter ??
                                    'Menunggu panggilan berikutnya'}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                            <Typography className="eyebrow">
                                Menunggu
                            </Typography>
                            <Typography variant="h3" sx={{ mt: 1 }}>
                                {state.stats.waiting}
                            </Typography>
                            <Box className="public-waiting-list" sx={{ mt: 2 }}>
                                {state.waiting.slice(0, 8).map((entry) => (
                                    <Chip key={entry.id} label={entry.number} />
                                ))}
                            </Box>
                            {!state.waiting.length && (
                                <Typography
                                    color="text.secondary"
                                    sx={{ mt: 2 }}
                                >
                                    Belum ada nomor yang menunggu.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ mt: 8 }}>
                    <SectionHeading
                        eyebrow="Sesuai kebutuhan"
                        title="Tiga pengalaman, satu antrian"
                    />
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: 'repeat(3, 1fr)',
                            },
                            gap: 2,
                        }}
                    >
                        <RoleCard
                            icon={<GroupsRounded />}
                            title="Untuk pelanggan"
                            detail="Pantau nomor yang sedang dipanggil dari ponsel."
                            href={home.url()}
                            action="Pantau antrian"
                        />
                        <RoleCard
                            icon={<DisplaySettingsRounded />}
                            title="Untuk lokasi"
                            detail="Gunakan layar besar untuk informasi yang mudah dilihat."
                            href={display.url()}
                            action="Buka display"
                        />
                        <RoleCard
                            icon={<PointOfSaleRounded />}
                            title="Untuk petugas"
                            detail="Kelola panggilan antrian dengan alur yang sederhana."
                            href={operator.url()}
                            action="Masuk operator"
                        />
                    </Box>
                </Box>

                <Box className="principle-strip" sx={{ mt: 7 }}>
                    <VerifiedUserRounded />
                    <Box>
                        <Typography sx={{ fontWeight: 700 }}>
                            Satu sumber kebenaran
                        </Typography>
                        <Typography color="text.secondary">
                            Nomor ditetapkan oleh server, lalu dibagikan ke
                            semua layar secara konsisten.
                        </Typography>
                    </Box>
                </Box>
                <InertiaButton
                    href={takeNumber.url()}
                    variant="text"
                    endIcon={<ArrowForwardRounded />}
                    sx={{ mt: 3 }}
                >
                    Ambil nomor di terminal
                </InertiaButton>
            </Container>
        </AppShell>
    );
}

function RoleCard({
    icon,
    title,
    detail,
    href,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    detail: string;
    href: string;
    action: string;
}) {
    return (
        <Card className="role-card">
            <CardContent sx={{ p: 3 }}>
                <Box className="role-icon">{icon}</Box>
                <Typography component="h3" variant="h6" sx={{ mt: 2 }}>
                    {title}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                    {detail}
                </Typography>
                <InertiaButton
                    href={href}
                    className="role-link"
                    endIcon={<ArrowForwardRounded />}
                >
                    {action}
                </InertiaButton>
            </CardContent>
        </Card>
    );
}
