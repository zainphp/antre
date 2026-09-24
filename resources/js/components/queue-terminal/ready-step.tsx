import CameraAltRounded from '@mui/icons-material/CameraAltRounded';
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export function ReadyStep({
    disabled,
    printerConfigured,
    photoRequired,
    onStart,
}: {
    disabled: boolean;
    printerConfigured: boolean;
    photoRequired: boolean;
    onStart: () => void;
}) {
    return (
        <Box className="self-step">
            <Box className="self-step-icon">
                <PhotoCameraRounded />
            </Box>
            <Typography variant="h4" component="h2">
                Selamat datang
            </Typography>
            <Typography
                className="kiosk-help"
                color="text.secondary"
                align="center"
                sx={{ maxWidth: 360, mt: 1 }}
            >
                {photoRequired
                    ? 'Ambil foto singkat terlebih dahulu. Foto diperlukan agar petugas dapat mengenali Anda saat dipanggil.'
                    : 'Ambil foto singkat jika berkenan, lalu kami berikan nomor untuk menunggu giliran Anda.'}
            </Typography>
            <Button
                className="kiosk-button"
                variant="contained"
                size="large"
                fullWidth
                disabled={disabled}
                onClick={onStart}
                startIcon={<CameraAltRounded />}
                sx={{ mt: 4 }}
            >
                Mulai ambil nomor
            </Button>
            {disabled && (
                <Typography
                    className="kiosk-help kiosk-help-muted"
                    variant="body2"
                    color="text.secondary"
                    align="center"
                    sx={{ mt: 1.5 }}
                >
                    {printerConfigured
                        ? 'Perangkat belum terhubung ke server.'
                        : 'Atur printer sebelum mengambil nomor.'}
                </Typography>
            )}
        </Box>
    );
}
