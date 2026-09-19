import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CameraAltRounded from '@mui/icons-material/CameraAltRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import LinkRounded from '@mui/icons-material/LinkRounded';
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded';
import PrintRounded from '@mui/icons-material/PrintRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
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
import type { QueueEntry, QueueState } from '@/types/queue';

type Step = 'ready' | 'camera' | 'review' | 'assigned';

export default function TakeNumber({ state: _state }: { state: QueueState }) {
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
                    'Kamera belum dapat digunakan. Anda dapat lanjut tanpa foto.',
                ),
            );

        return () => {
            active = false;
            stopCamera(stream);
        };
    }, [step]);

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
            };
            if (!response.ok || !payload.data) {
                throw new Error(
                    payload.message ?? 'Nomor belum dapat diambil. Coba lagi.',
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
            <Container
                component="main"
                maxWidth="sm"
                className="self-service-page"
            >
                <Box className="self-service-header">
                    <Box>
                        <Typography className="eyebrow">Pintu masuk</Typography>
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
                                busy={busy}
                                onConfirm={() => void requestNumber()}
                                onBack={() => setStep('ready')}
                            />
                        )}
                        {step === 'assigned' && assigned && (
                            <AssignedStep
                                number={assigned.number}
                                onPrint={() =>
                                    printQueueTicket(
                                        assigned.number,
                                        assigned.created_at,
                                    )
                                }
                                onDone={reset}
                            />
                        )}
                    </CardContent>
                </Card>
                <Typography className="privacy-note">
                    Foto dikirim secara aman ke server untuk membantu
                    identifikasi antrian dan tidak ditampilkan di monitor
                    publik.
                </Typography>
            </Container>
        </Box>
    );
}

function ReadyStep({
    disabled,
    onStart,
}: {
    disabled: boolean;
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
                color="text.secondary"
                align="center"
                sx={{ maxWidth: 360, mt: 1 }}
            >
                Ambil foto singkat, lalu kami berikan nomor untuk menunggu
                giliran Anda.
            </Typography>
            <Button
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
    onCapture,
    onWithoutPhoto,
    onBack,
}: {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    photoError: boolean;
    onCapture: () => void;
    onWithoutPhoto: () => void;
    onBack: () => void;
}) {
    return (
        <Box className="self-step">
            <Typography className="eyebrow">Langkah 1 dari 2</Typography>
            <Typography variant="h4" component="h2" sx={{ mt: 1 }}>
                Ambil foto
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, mb: 2.5 }}>
                Pastikan wajah terlihat jelas dan pencahayaan cukup.
            </Typography>
            <Box className="camera-frame">
                {photoError ? (
                    <Box className="camera-fallback">
                        <CameraAltRounded />
                        <Typography sx={{ fontWeight: 700 }}>
                            Kamera tidak tersedia
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Anda tetap dapat mengambil nomor tanpa foto.
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
                    variant="contained"
                    size="large"
                    onClick={onCapture}
                    disabled={photoError}
                    startIcon={<PhotoCameraRounded />}
                >
                    Ambil foto
                </Button>
                <Button
                    variant="outlined"
                    size="large"
                    onClick={onWithoutPhoto}
                >
                    Lanjut tanpa foto
                </Button>
                <Button
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
    busy,
    onConfirm,
    onBack,
}: {
    photo: string | null;
    busy: boolean;
    onConfirm: () => void;
    onBack: () => void;
}) {
    return (
        <Box className="self-step">
            <Typography className="eyebrow">Langkah 2 dari 2</Typography>
            <Typography variant="h4" component="h2" sx={{ mt: 1 }}>
                {photo ? 'Foto sudah siap' : 'Lanjut tanpa foto'}
            </Typography>
            {photo ? (
                <Box className="photo-preview">
                    <img src={photo} alt="Foto untuk tiket antrian" />
                </Box>
            ) : (
                <Box className="no-photo-note">
                    <CameraAltRounded />
                    <Typography color="text.secondary">
                        Tidak masalah. Petugas akan memanggil berdasarkan nomor
                        Anda.
                    </Typography>
                </Box>
            )}
            <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                <Button
                    variant="contained"
                    size="large"
                    onClick={onConfirm}
                    disabled={busy}
                    endIcon={<ArrowForwardRounded />}
                >
                    {busy ? 'Meminta nomor…' : 'Ambil nomor antrian'}
                </Button>
                <Button
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
        <Box className="self-step assigned-step">
            <CheckCircleRounded className="assigned-icon" />
            <Typography className="eyebrow">Nomor Anda</Typography>
            <Typography className="assigned-number">{number}</Typography>
            <Typography color="text.secondary" align="center">
                Simpan nomor ini dan perhatikan panggilan di layar.
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 3, width: '100%' }}>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<PrintRounded />}
                    onClick={onPrint}
                >
                    Cetak tiket
                </Button>
                <Button variant="outlined" size="large" onClick={onDone}>
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
