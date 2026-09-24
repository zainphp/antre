import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CameraAltRounded from '@mui/icons-material/CameraAltRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function ReviewStep({
    photo,
    photoRequired,
    busy,
    onConfirm,
    onBack,
}: {
    photo: string | null;
    photoRequired: boolean;
    busy: boolean;
    onConfirm: () => void;
    onBack: () => void;
}) {
    return (
        <Box className="self-step">
            <Typography className="kiosk-step-label">
                Langkah 2 dari 2
            </Typography>
            <Typography variant="h4" component="h2" sx={{ mt: 1 }}>
                {photo
                    ? 'Foto sudah siap'
                    : photoRequired
                      ? 'Foto diperlukan'
                      : 'Lanjut tanpa foto'}
            </Typography>
            {photo ? (
                <Box className="photo-preview">
                    <img src={photo} alt="Foto untuk tiket antrian" />
                </Box>
            ) : (
                <Box className="no-photo-note">
                    <CameraAltRounded />
                    <Typography className="kiosk-help" color="text.secondary">
                        {photoRequired
                            ? 'Ambil foto terlebih dahulu sebelum melanjutkan.'
                            : 'Tidak masalah. Petugas akan memanggil berdasarkan nomor Anda.'}
                    </Typography>
                </Box>
            )}
            <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                <Button
                    className="kiosk-button"
                    variant="contained"
                    size="large"
                    onClick={onConfirm}
                    disabled={busy}
                    endIcon={<ArrowForwardRounded />}
                >
                    {busy ? 'Meminta nomor…' : 'Ambil nomor antrian'}
                </Button>
                <Button
                    className="kiosk-button"
                    variant="text"
                    onClick={onBack}
                    startIcon={<ReplayRounded />}
                >
                    Ulangi ambil foto
                </Button>
            </Stack>
            {busy && <LinearProgress sx={{ mt: 2 }} />}
        </Box>
    );
}
