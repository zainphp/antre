import LinkRounded from '@mui/icons-material/LinkRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Head, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ConnectionBadge } from '@/components/connection-badge';
import { AssignedStep } from '@/components/queue-terminal/assigned-step';
import {
    BluetoothPrinterBadge,
    type BluetoothPrinterState,
} from '@/components/queue-terminal/bluetooth-printer-badge';
import { CameraStep } from '@/components/queue-terminal/camera-step';
import { ReadyStep } from '@/components/queue-terminal/ready-step';
import { ReviewStep } from '@/components/queue-terminal/review-step';
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

function csrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}
