import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CameraAltRounded from '@mui/icons-material/CameraAltRounded';
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, type RefObject } from 'react';

export function CameraStep({
    videoRef,
    photoError,
    photoRequired,
    onCapture,
    onWithoutPhoto,
    onBack,
    onRetry,
}: {
    videoRef: RefObject<HTMLVideoElement | null>;
    photoError: boolean;
    photoRequired: boolean;
    onCapture: () => void;
    onWithoutPhoto: () => void;
    onBack: () => void;
    onRetry: () => void;
}) {
    const stepRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            stepRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'end',
            });
        });

        return () => window.cancelAnimationFrame(frame);
    }, []);

    return (
        <Box ref={stepRef} className="self-step">
            <Typography className="kiosk-step-label">
                Langkah 1 dari 2
            </Typography>
            <Typography variant="h4" component="h2" sx={{ mt: 1 }}>
                Ambil foto
            </Typography>
            <Typography
                className="kiosk-help"
                color="text.secondary"
                sx={{ mt: 0.75, mb: 2.5 }}
            >
                Pastikan wajah terlihat jelas. Lepaskan topi atau masker,
                tersenyumlah, dan pastikan pencahayaan cukup.
            </Typography>
            <Box
                className={
                    photoError
                        ? 'camera-frame camera-frame-error'
                        : 'camera-frame'
                }
            >
                {photoError ? (
                    <Box className="camera-fallback">
                        <CameraAltRounded />
                        <Typography sx={{ color: 'inherit', fontWeight: 700 }}>
                            Kamera tidak tersedia
                        </Typography>
                    </Box>
                ) : (
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        aria-label="Pratinjau kamera"
                    />
                )}
            </Box>
            <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                {photoError ? (
                    <Button
                        className="kiosk-button"
                        variant="contained"
                        size="large"
                        onClick={onRetry}
                        startIcon={<ReplayRounded />}
                    >
                        Coba lagi
                    </Button>
                ) : (
                    <Button
                        className="kiosk-button"
                        variant="contained"
                        size="large"
                        onClick={onCapture}
                        startIcon={<PhotoCameraRounded />}
                    >
                        Ambil foto
                    </Button>
                )}
                {!photoRequired && (
                    <Button
                        className="kiosk-button"
                        variant="outlined"
                        size="large"
                        onClick={onWithoutPhoto}
                    >
                        Lanjut tanpa foto
                    </Button>
                )}
                <Button
                    className="kiosk-button"
                    variant="text"
                    onClick={onBack}
                    startIcon={<ArrowBackRounded />}
                >
                    Kembali
                </Button>
            </Stack>
        </Box>
    );
}
