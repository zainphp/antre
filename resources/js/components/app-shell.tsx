import HomeRounded from '@mui/icons-material/HomeRounded';
import LinkRounded from '@mui/icons-material/LinkRounded';
import QueueRounded from '@mui/icons-material/QueueRounded';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { InertiaButton } from '@/components/inertia-button';
import { home, logout, pair } from '@/routes';

type SharedProps = {
    auth: { user: { name: string; role: string } | null };
    flash: { success?: string; error?: string };
};

export function AppShell({ children }: { children: ReactNode }) {
    const { auth, flash } = usePage().props as unknown as SharedProps;
    const currentUrl = usePage().url;

    return (
        <Box className="app-shell">
            <AppBar position="sticky" elevation={0} className="app-bar">
                <Toolbar className="app-toolbar">
                    <InertiaButton
                        href={home.url()}
                        color="inherit"
                        className="brand-mark"
                        aria-label="Kembali ke beranda"
                    >
                        <Box className="brand-symbol" aria-hidden="true">
                            <QueueRounded fontSize="small" />
                        </Box>
                        <Box>
                            <Typography className="brand-name">
                                Antre
                            </Typography>
                            <Typography className="brand-caption">
                                Layanan antrian
                            </Typography>
                        </Box>
                    </InertiaButton>
                    <Box sx={{ flex: 1 }} />
                    {currentUrl !== '/' && (
                        <InertiaButton
                            href={home.url()}
                            color="inherit"
                            startIcon={<HomeRounded />}
                            sx={{ opacity: 0.86 }}
                        >
                            Beranda
                        </InertiaButton>
                    )}
                    {auth.user ? (
                        <InertiaButton
                            href={logout.url()}
                            method="post"
                            color="inherit"
                            sx={{ opacity: 0.86 }}
                        >
                            Keluar
                        </InertiaButton>
                    ) : currentUrl !== '/pair' ? (
                        <InertiaButton
                            href={pair.url()}
                            color="inherit"
                            startIcon={<LinkRounded />}
                            sx={{ opacity: 0.86 }}
                        >
                            Hubungkan perangkat
                        </InertiaButton>
                    ) : null}
                </Toolbar>
            </AppBar>
            {(flash.success || flash.error) && (
                <Container maxWidth="lg" sx={{ pt: 2 }}>
                    <Alert severity={flash.error ? 'error' : 'success'}>
                        {flash.error ?? flash.success}
                    </Alert>
                </Container>
            )}
            <Box component="main" id="main-content">
                {children}
            </Box>
            <Container component="footer" maxWidth="lg" className="app-footer">
                <Typography variant="caption">
                    Antre menyimpan status antrian secara terpusat agar setiap
                    layar tetap selaras.
                </Typography>
            </Container>
        </Box>
    );
}
