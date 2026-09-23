import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CameraAltRounded from '@mui/icons-material/CameraAltRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import BluetoothConnectedRounded from '@mui/icons-material/BluetoothConnectedRounded';
import BluetoothDisabledRounded from '@mui/icons-material/BluetoothDisabledRounded';
import LinkRounded from '@mui/icons-material/LinkRounded';
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded';
import PrintRounded from '@mui/icons-material/PrintRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Head, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ConnectionBadge } from '@/components/connection-badge';
import queue from '@/routes/queue';
import queueTerminalRoutes from '@/routes/queue-terminal';
import {
    captureCamera,
    dataUrlToBlob,
    startCamera,
    stopCamera,
} from '@/services/camera';
import {
    connectRememberedWebBluetoothPrinter,
    loadPrinterSettings,
    printQueueTicket,
    repairWebBluetoothPrinter,
    savePrinterSettings,
    type PrinterSettings,
} from '@/services/printer';
import { useOnlineState } from '@/hooks/use-online-state';
import type { QueueEntry } from '@/types/queue';

type Step = 'ready' | 'camera' | 'review' | 'assigned';
type BluetoothPrinterState =
    | 'CONNECTED'
    | 'DISCONNECTED'
    | 'RECONNECTING'
    | 'FAILED';

const ASSIGNED_STEP_IDLE_TIMEOUT_MS = 30_000;
const PRINT_COOLDOWN_MS = 5_000;

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
    const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(
        () => loadPrinterSettings(),
    );
    const [printerState, setPrinterState] = useState<BluetoothPrinterState>(
        printerSettings.mode === 'web-bluetooth'
            ? 'RECONNECTING'
            : 'DISCONNECTED',
    );
    const [step, setStep] = useState<Step>('ready');
    const [photo, setPhoto] = useState<string | null>(null);
    const [assigned, setAssigned] = useState<QueueEntry | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [requestId, setRequestId] = useState(() => crypto.randomUUID());
    const [cameraAttempt, setCameraAttempt] = useState(0);
    const printerConfigured = printerSettings.mode !== null;

    const reconnectBluetooth = useCallback((): void => {
        if (printerSettings.mode !== 'web-bluetooth') {
            return;
        }

        setPrinterState('RECONNECTING');
        void connectRememberedWebBluetoothPrinter(printerSettings, () => {
            setPrinterState('DISCONNECTED');
        })
            .then(() => setPrinterState('CONNECTED'))
            .catch(() => setPrinterState('FAILED'));
    }, [printerSettings]);

    const repairBluetooth = useCallback((): void => {
        if (printerSettings.mode !== 'web-bluetooth') {
            return;
        }

        setPrinterState('RECONNECTING');
        void repairWebBluetoothPrinter(printerSettings, () => {
            setPrinterState('DISCONNECTED');
        })
            .then((device) => {
                const nextSettings = {
                    ...printerSettings,
                    bluetoothDeviceId: device.id,
                    bluetoothDeviceName: device.name,
                };
                setPrinterSettings(nextSettings);
                savePrinterSettings(nextSettings);
                setPrinterState('CONNECTED');
            })
            .catch(() => setPrinterState('FAILED'));
    }, [printerSettings]);

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
    }, [cameraAttempt, photoRequired, step]);

    useEffect(() => {
        if (printerSettings.mode !== 'web-bluetooth') {
            return;
        }

        reconnectBluetooth();
    }, [printerSettings.mode, reconnectBluetooth]);

    const reset = useCallback((): void => {
        setStep('ready');
        setPhoto(null);
        setAssigned(null);
        setError(null);
        setBusy(false);
        setRequestId(crypto.randomUUID());
    }, []);

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
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                        }}
                    >
                        <ConnectionBadge
                            state={online ? 'CONNECTED' : 'DISCONNECTED'}
                        />
                        {printerSettings.mode === 'web-bluetooth' && (
                            <BluetoothPrinterBadge
                                name={printerSettings.bluetoothDeviceName}
                                state={printerState}
                                onReconnect={repairBluetooth}
                            />
                        )}
                        <IconButton
                            onClick={() =>
                                router.visit(queueTerminalRoutes.settings.url())
                            }
                            color="primary"
                            aria-label="Pengaturan printer"
                        >
                            <SettingsRounded />
                        </IconButton>
                    </Stack>
                </Box>
                {!printerConfigured && (
                    <Alert
                        className="kiosk-alert"
                        severity="warning"
                        sx={{ mb: 2.5 }}
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() =>
                                    router.visit(
                                        queueTerminalRoutes.settings.url(),
                                    )
                                }
                            >
                                Atur printer
                            </Button>
                        }
                    >
                        Metode cetak belum dipilih. Atur printer sebelum
                        mengambil nomor.
                    </Alert>
                )}
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
                                disabled={!online || !printerConfigured}
                                printerConfigured={printerConfigured}
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
                                onRetry={() => {
                                    setError(null);
                                    setCameraAttempt((attempt) => attempt + 1);
                                }}
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
                                        sessionName,
                                        photo,
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

function CameraStep({
    videoRef,
    photoError,
    photoRequired,
    onCapture,
    onWithoutPhoto,
    onBack,
    onRetry,
}: {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    photoError: boolean;
    photoRequired: boolean;
    onCapture: () => void;
    onWithoutPhoto: () => void;
    onBack: () => void;
    onRetry: () => void;
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
                    Ulangi ambil foto
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
    onPrint: () => Promise<void>;
    onDone: () => void;
}) {
    const [printing, setPrinting] = useState(false);
    const [printCooldown, setPrintCooldown] = useState(false);
    const [printError, setPrintError] = useState<string | null>(null);
    const [printStarted, setPrintStarted] = useState(false);
    const autoPrintStarted = useRef(false);

    useEffect(() => {
        if (!printCooldown) {
            return;
        }

        const timeout = window.setTimeout(
            () => setPrintCooldown(false),
            PRINT_COOLDOWN_MS,
        );

        return () => window.clearTimeout(timeout);
    }, [printCooldown]);

    useEffect(() => {
        let timeout = window.setTimeout(onDone, ASSIGNED_STEP_IDLE_TIMEOUT_MS);
        const resetTimeout = (): void => {
            window.clearTimeout(timeout);
            timeout = window.setTimeout(onDone, ASSIGNED_STEP_IDLE_TIMEOUT_MS);
        };
        const activityEvents = ['pointerdown', 'keydown'] as const;

        activityEvents.forEach((event) =>
            window.addEventListener(event, resetTimeout),
        );

        return () => {
            window.clearTimeout(timeout);
            activityEvents.forEach((event) =>
                window.removeEventListener(event, resetTimeout),
            );
        };
    }, [onDone]);

    const print = useCallback(async (): Promise<void> => {
        setPrinting(true);
        setPrintCooldown(true);
        setPrintStarted(true);
        setPrintError(null);

        try {
            await onPrint();
        } catch (reason) {
            setPrintError(
                reason instanceof Error
                    ? reason.message
                    : 'Tiket belum dapat dicetak.',
            );
        } finally {
            setPrinting(false);
        }
    }, [onPrint]);

    useEffect(() => {
        if (autoPrintStarted.current) {
            return;
        }

        autoPrintStarted.current = true;
        void print();
    }, [print]);

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
                {printStarted && !printError
                    ? 'Setelah tiket keluar, tekan Selesai untuk membuat tiket baru.'
                    : 'Simpan nomor ini dan perhatikan panggilan di layar.'}
            </Typography>
            {printError && (
                <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                    {printError}
                </Alert>
            )}
            <Stack spacing={1.25} sx={{ mt: 3, width: '100%' }}>
                <Button
                    className="kiosk-button"
                    variant="contained"
                    size="large"
                    onClick={onDone}
                >
                    Selesai
                </Button>
                <Button
                    className="kiosk-button"
                    variant="outlined"
                    size="large"
                    startIcon={<PrintRounded />}
                    onClick={() => void print()}
                    disabled={printing || printCooldown}
                >
                    {printing
                        ? 'Mencetak…'
                        : printCooldown
                          ? 'Tunggu sebentar…'
                          : 'Ulangi cetak tiket'}
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

function BluetoothPrinterBadge({
    name,
    state,
    onReconnect,
}: {
    name: string | null;
    state: BluetoothPrinterState;
    onReconnect?: () => void;
}) {
    const connected = state === 'CONNECTED';
    const reconnecting = state === 'RECONNECTING';
    const canReconnect = !connected && !reconnecting && onReconnect;

    return (
        <Chip
            size="small"
            icon={
                reconnecting ? (
                    <CircularProgress color="inherit" size={16} />
                ) : connected ? (
                    <BluetoothConnectedRounded fontSize="small" />
                ) : (
                    <BluetoothDisabledRounded fontSize="small" />
                )
            }
            label={
                connected
                    ? 'Printer terhubung'
                    : reconnecting
                      ? 'Menyambungkan printer'
                      : 'Printer terputus'
            }
            color={connected ? 'success' : reconnecting ? 'warning' : 'error'}
            variant={connected ? 'filled' : 'outlined'}
            clickable={Boolean(canReconnect)}
            disabled={reconnecting}
            onClick={canReconnect ? onReconnect : undefined}
            aria-label={
                canReconnect
                    ? 'Hubungkan ulang printer'
                    : connected
                      ? 'Printer terhubung'
                      : 'Printer sedang disambungkan'
            }
            title={name ? `Printer: ${name}` : undefined}
        />
    );
}
