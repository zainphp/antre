import ConfirmationNumberRounded from '@mui/icons-material/ConfirmationNumberRounded';
import RestartAltRounded from '@mui/icons-material/RestartAltRounded';
import StorageRounded from '@mui/icons-material/StorageRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Head, useForm } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';

import { AdminLayout } from '@/components/admin-layout';
import admin from '@/routes/admin';

export default function Storage({
    ticketCount,
    photoCount,
    photoStorageBytes,
}: {
    ticketCount: number;
    photoCount: number;
    photoStorageBytes: number;
}) {
    const resetForm = useForm({});
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const resetSession = (): void => {
        resetForm.post(admin.storage.reset.url(), {
            onSuccess: () => setResetDialogOpen(false),
        });
    };

    return (
        <AdminLayout>
            <Head title="Penyimpanan" />
            <Container maxWidth="lg" className="admin-page">
                <Box>
                    <Typography className="eyebrow">Administrator</Typography>
                    <Typography variant="h3" component="h1" sx={{ mt: 0.75 }}>
                        Penyimpanan
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Pantau jumlah tiket dan foto pelanggan yang tersimpan.
                    </Typography>
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                        },
                        gap: 2,
                        mt: 4,
                    }}
                >
                    <UsageCard
                        icon={<ConfirmationNumberRounded />}
                        label="Tiket dalam database"
                        value={ticketCount.toLocaleString('id-ID')}
                        detail="Termasuk seluruh sesi dan riwayat tiket."
                    />
                    <UsageCard
                        icon={<StorageRounded />}
                        label="Foto pelanggan tersimpan"
                        value={photoCount.toLocaleString('id-ID')}
                        detail={
                            formatBytes(photoStorageBytes) +
                            ' digunakan oleh foto antrian.'
                        }
                    />
                </Box>

                <Card sx={{ mt: 3 }}>
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            sx={{
                                alignItems: {
                                    xs: 'flex-start',
                                    sm: 'center',
                                },
                                gap: 2,
                                justifyContent: 'space-between',
                            }}
                        >
                            <Stack
                                direction="row"
                                sx={{ alignItems: 'flex-start', gap: 2 }}
                            >
                                <Box className="role-icon">
                                    <RestartAltRounded />
                                </Box>
                                <Box>
                                    <Typography component="h2" variant="h6">
                                        Reset sesi antrian
                                    </Typography>
                                    <Typography
                                        color="text.secondary"
                                        sx={{ mt: 0.5 }}
                                    >
                                        Hapus foto sesi aktif dan mulai
                                        penomoran baru. Riwayat tiket tetap
                                        tersimpan di database.
                                    </Typography>
                                </Box>
                            </Stack>
                            <Button
                                color="warning"
                                variant="outlined"
                                startIcon={<RestartAltRounded />}
                                disabled={resetForm.processing}
                                onClick={() => setResetDialogOpen(true)}
                            >
                                Reset sesi
                            </Button>
                        </Stack>
                        <Alert severity="info" sx={{ mt: 3 }}>
                            Gunakan reset setelah pelayanan hari ini selesai.
                        </Alert>
                    </CardContent>
                </Card>
            </Container>

            <Dialog
                open={resetDialogOpen}
                onClose={() => setResetDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Reset sesi antrian?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Sesi aktif akan diarsipkan, foto pelanggan akan dihapus
                        dari penyimpanan, dan nomor berikutnya dimulai dari
                        awal. Riwayat tiket tetap aman.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResetDialogOpen(false)}>
                        Batal
                    </Button>
                    <Button
                        color="warning"
                        variant="contained"
                        startIcon={<RestartAltRounded />}
                        disabled={resetForm.processing}
                        onClick={resetSession}
                    >
                        Reset sesi
                    </Button>
                </DialogActions>
            </Dialog>
        </AdminLayout>
    );
}

function UsageCard({
    icon,
    label,
    value,
    detail,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack
                    direction="row"
                    sx={{ alignItems: 'flex-start', gap: 2 }}
                >
                    <Box className="role-icon">{icon}</Box>
                    <Box>
                        <Typography color="text.secondary" variant="body2">
                            {label}
                        </Typography>
                        <Typography
                            color="primary"
                            sx={{
                                fontFamily: 'Georgia, serif',
                                fontSize: '2.5rem',
                                fontWeight: 700,
                                lineHeight: 1,
                                mt: 1,
                            }}
                        >
                            {value}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                            {detail}
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

function formatBytes(bytes: number): string {
    if (bytes === 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1,
    );
    const value = bytes / 1024 ** unitIndex;

    return value.toFixed(unitIndex === 0 ? 0 : 1) + ' ' + units[unitIndex];
}
