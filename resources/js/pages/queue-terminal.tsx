import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CameraAltRounded from '@mui/icons-material/CameraAltRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import LinkRounded from '@mui/icons-material/LinkRounded';
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded';
import PrintRounded from '@mui/icons-material/PrintRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import { ConnectionBadge } from '@/components/connection-badge';
import queue from '@/routes/queue';
import {
    captureCamera,
    dataUrlToBlob,
    startCamera,
    stopCamera,
} from '@/services/camera';
import { printQueueTicket } from '@/services/print-queue-ticket';
import { useOnlineState } from '@/hooks/use-online-state';
import type { QueueEntry } from '@/types/queue';

type Step = 'ready' | 'camera' | 'review' | 'assigned';

type QueueTerminalProps = {
    brandName: string;
    sessionName: string;
    photoRequired: boolean;
};

export default function QueueTerminal({
    brandName,
    sessionName,
    photoRequired,
}: QueueTerminalProps) {
    const online = useOnlineState();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [step, setStep] = useState<Step>('ready');
    const [photo, setPhoto] = useState<string | null>(null);
    const [assigned, setAssigned] = useState<QueueEntry | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [requestId, setRequestId] = useState(() => crypto.randomUUID());

    useEffect(() => {
        if (step !== 'camera' || !videoRef.current) {
            return;
        }

        let active = true;
        let stream: MediaStream | null = null;
        void startCamera(videoRef.current)
            .then((started) => {
                if (active) {
                    stream = started;
                } else {
                    stopCamera(started);
                }
            })
            .catch(() =>
                setError(
                    photoRequired
                        ? 'Kamera diperlukan untuk mengambil nomor. Izinkan akses kamera, lalu coba lagi.'
                        : 'Kamera belum dapat digunakan. Anda tetap dapat mengambil nomor tanpa foto.',
                ),
            );

        return () => {
            active = false;
            stopCamera(stream);
        };
    }, [photoRequired, step]);

    const reset = () => {
        setStep('ready');
        setPhoto(null);
        setAssigned(null);
        setError(null);
        setBusy(false);
        setRequestId(crypto.randomUUID());
    };

    const requestNumber = async () => {
        setBusy(true);
        setError(null);
        try {
            const body = new FormData();
            body.append('request_id', requestId);
            if (photo) {
                body.append('photo', dataUrlToBlob(photo), 'queue-photo.jpg');
            }
            const response = await fetch(queue.take.url(), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body,
            });
            const payload = (await response.json()) as {
                data?: QueueEntry;
                message?: string;
                errors?: { photo?: string[] };
            };
            if (!response.ok || !payload.data) {
                throw new Error(
                    payload.errors?.photo
                        ? 'Foto wajib diambil sebelum nomor dapat diberikan.'
                        : (payload.message ??
                              'Nomor belum dapat diambil. Coba lagi.'),
                );
            }
            setAssigned(payload.data);
            setStep('assigned');
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : 'Nomor belum dapat diambil. Coba lagi.',
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box className="self-service-kiosk">
            <Head title="Ambil Nomor" />
            <Container
                component="main"
                maxWidth="sm"
                className="self-service-page"
            >
                <Box className="self-service-header">
                    <Box>
                        <Typography className="self-service-brand">
                            {brandName}
                        </Typography>
                        <Typography className="self-service-session">
                            {sessionName}
                        </Typography>
                        <Typography
                            variant="h1"
                            sx={{
                                fontSize: { xs: '2.25rem', sm: '2.8rem' },
                                mt: 1,
                            }}
                        >
                            Ambil nomor antrian
                        </Typography>
                    </Box>
                    <ConnectionBadge
                        state={online ? 'CONNECTED' : 'DISCONNECTED'}
                    />
                </Box>
                {!online && (
                    <Alert
                        className="kiosk-alert"
                        severity="warning"
                        icon={<LinkRounded />}
                        sx={{ mb: 2.5 }}
                    >
                        Koneksi terputus. Sambungkan kembali sebelum meminta
                        nomor.
                    </Alert>
                )}
                {error && (
                    <Alert
                        className="kiosk-alert"
                        severity="error"
                        sx={{ mb: 2.5 }}
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}
                <Card className="self-service-card">
                    <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
                        {step === 'ready' && (
                            <ReadyStep
                                disabled={!online}
                                photoRequired={photoRequired}
                                onStart={() => {
                                    setError(null);
                                    setStep('camera');
                                }}
                            />
                        )}
                        {step === 'camera' && (
                            <CameraStep
                                videoRef={videoRef}
                                photoError={Boolean(error)}
                                photoRequired={photoRequired}
                                onCapture={() => {
                                    if (!videoRef.current) return;
                                    setPhoto(captureCamera(videoRef.current));
                                    setStep('review');
                                }}
                                onWithoutPhoto={() => {
                                    setPhoto(null);
                                    setStep('review');
                                    setError(null);
                                }}
                                onBack={reset}
                            />
                        )}
                        {step === 'review' && (
                            <ReviewStep
                                photo={photo}
                                photoRequired={photoRequired}
                                busy={busy}
                                onConfirm={() => void requestNumber()}
                                onBack={() => {
                                    setPhoto(null);
                                    setError(null);
                                    setStep('camera');
                                }}
                            />
                        )}
                        {step === 'assigned' && assigned && (
                            <AssignedStep
                                number={assigned.number}
                                onPrint={() =>
                                    printQueueTicket(
                                        assigned.number,
                                        assigned.created_at,
                                        brandName,
                                    )
                                }
                                onDone={reset}
                            />
                        )}
                    </CardContent>
                </Card>
                <Typography component="p" className="self-service-copyright">
                    © {new Date().getFullYear()} Antre by zainphp
                </Typography>
            </Container>
        </Box>
    );
}

function ReadyStep({
    disabled,
    photoRequired,
    onStart,
}: {
    disabled: boolean;
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
                    Perangkat belum terhubung ke server.
                </Typography>
            )}
        </Box>
    );
}

function CameraStep({
    videoRef,
    photoError,
    photoRequired,
    onCapture,
    onWithoutPhoto,
    onBack,
}: {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    photoError: boolean;
    photoRequired: boolean;
    onCapture: () => void;
    onWithoutPhoto: () => void;
    onBack: () => void;
}) {
    return (
        <Box className="self-step">
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
                Pastikan wajah terlihat jelas dan pencahayaan cukup.
            </Typography>
            <Box className="camera-frame">
                {photoError ? (
                    <Box className="camera-fallback">
                        <CameraAltRounded />
                        <Typography sx={{ fontWeight: 700 }}>
                            Kamera tidak tersedia
                        </Typography>
                        <Typography
                            className="kiosk-help"
                            color="text.secondary"
                        >
                            {photoRequired
                                ? 'Foto wajib diambil. Izinkan akses kamera pada browser, lalu coba lagi.'
                                : 'Anda tetap dapat mengambil nomor tanpa foto.'}
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
                <Button
                    className="kiosk-button"
                    variant="contained"
                    size="large"
                    onClick={onCapture}
                    disabled={photoError}
                    startIcon={<PhotoCameraRounded />}
                >
                    Ambil foto
                </Button>
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

function ReviewStep({
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
                    Ambil foto lagi
                </Button>
            </Stack>
            {busy && <LinearProgress sx={{ mt: 2 }} />}
        </Box>
    );
}

function AssignedStep({
    number,
    onPrint,
    onDone,
}: {
    number: string;
    onPrint: () => void;
    onDone: () => void;
}) {
    return (
        <Box
            className="self-step assigned-step"
            role="status"
            aria-live="polite"
        >
            <CheckCircleRounded className="assigned-icon" />
            <Typography className="kiosk-step-label">Nomor Anda</Typography>
            <Typography className="assigned-number">{number}</Typography>
            <Typography
                className="kiosk-help"
                color="text.secondary"
                align="center"
            >
                Simpan nomor ini dan perhatikan panggilan di layar.
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 3, width: '100%' }}>
                <Button
                    className="kiosk-button"
                    variant="contained"
                    size="large"
                    startIcon={<PrintRounded />}
                    onClick={onPrint}
                >
                    Cetak tiket
                </Button>
                <Button
                    className="kiosk-button"
                    variant="outlined"
                    size="large"
                    onClick={onDone}
                >
                    Selesai
                </Button>
            </Stack>
        </Box>
    );
}

function csrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}
