import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import BluetoothRounded from '@mui/icons-material/BluetoothRounded';
import LaunchRounded from '@mui/icons-material/LaunchRounded';
import PrintRounded from '@mui/icons-material/PrintRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

import { queueTerminal } from '@/routes';
import {
    loadPrinterSettings,
    openAndroidBluetoothSettings,
    openAndroidPrintSettings,
    pairWebBluetoothPrinter,
    printQueueTicket,
    rawBtInstallUrl,
    savePrinterSettings,
    supportsWebBluetooth,
    type PrinterMode,
    type PrinterSettings,
} from '@/services/printer';

type Feedback = {
    severity: 'error' | 'info' | 'success';
    message: string;
};

export default function QueueTerminalSettings({
    brandName,
}: {
    brandName: string;
}) {
    const [settings, setSettings] = useState<PrinterSettings>(() =>
        loadPrinterSettings(),
    );
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const bluetoothAvailable = supportsWebBluetooth();

    const changeMode = (mode: PrinterMode): void => {
        const next = { ...settings, mode };
        setSettings(next);
        savePrinterSettings(next);
        setFeedback(null);
    };

    const connectBluetooth = async (): Promise<void> => {
        setBusy(true);
        setFeedback(null);

        try {
            const device = await pairWebBluetoothPrinter();
            const next: PrinterSettings = {
                ...settings,
                mode: 'web-bluetooth',
                bluetoothDeviceId: device.id,
                bluetoothDeviceName: device.name,
            };
            setSettings(next);
            savePrinterSettings(next);
            setFeedback({
                severity: 'success',
                message: `Printer ${device.name} berhasil dihubungkan.`,
            });
        } catch (reason) {
            setFeedback({
                severity: 'error',
                message:
                    reason instanceof Error
                        ? reason.message
                        : 'Printer BLE belum dapat dihubungkan.',
            });
        } finally {
            setBusy(false);
        }
    };

    const testPrint = async (): Promise<void> => {
        setBusy(true);
        setFeedback(null);

        try {
            await printQueueTicket(
                'UJI',
                new Date().toLocaleString('id-ID'),
                brandName,
            );
            setFeedback({
                severity: 'success',
                message: 'Perintah cetak sudah dikirim.',
            });
        } catch (reason) {
            setFeedback({
                severity: 'error',
                message:
                    reason instanceof Error
                        ? reason.message
                        : 'Tes cetak belum berhasil.',
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box className="self-service-kiosk">
            <Head title="Pengaturan Printer" />
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
                            Terminal ambil nomor
                        </Typography>
                        <Typography variant="h1" component="h1">
                            Pengaturan printer
                        </Typography>
                    </Box>
                    <SettingsRounded color="primary" fontSize="large" />
                </Box>

                {feedback && (
                    <Alert severity={feedback.severity} sx={{ mb: 2.5 }}>
                        {feedback.message}
                    </Alert>
                )}

                <Card>
                    <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
                        <Typography variant="h5" component="h2">
                            Cara mencetak tiket
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                            Pengaturan ini hanya tersimpan di perangkat terminal
                            ini.
                        </Typography>

                        <FormControl fullWidth sx={{ mt: 3 }}>
                            <RadioGroup
                                value={settings.mode}
                                onChange={(event) =>
                                    changeMode(
                                        event.target.value as PrinterMode,
                                    )
                                }
                            >
                                <FormControlLabel
                                    value="browser"
                                    control={<Radio />}
                                    label={
                                        <Box>
                                            <Typography
                                                sx={{ fontWeight: 700 }}
                                            >
                                                Dialog cetak Android
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Gunakan printer yang tersedia
                                                pada layanan cetak Android.
                                            </Typography>
                                        </Box>
                                    }
                                    sx={{ alignItems: 'flex-start', py: 1 }}
                                />
                                <FormControlLabel
                                    value="rawbt"
                                    control={<Radio />}
                                    label={
                                        <Box>
                                            <Typography
                                                sx={{ fontWeight: 700 }}
                                            >
                                                RawBT melalui intent
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Kirim tiket langsung ke printer
                                                Bluetooth Classic ESC/POS.
                                            </Typography>
                                        </Box>
                                    }
                                    sx={{ alignItems: 'flex-start', py: 1 }}
                                />
                                <FormControlLabel
                                    value="web-bluetooth"
                                    control={<Radio />}
                                    disabled={!bluetoothAvailable}
                                    label={
                                        <Box>
                                            <Typography
                                                sx={{ fontWeight: 700 }}
                                            >
                                                Web Bluetooth (BLE)
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Hanya untuk printer Bluetooth LE
                                                yang memiliki kanal cetak.
                                            </Typography>
                                        </Box>
                                    }
                                    sx={{ alignItems: 'flex-start', py: 1 }}
                                />
                            </RadioGroup>
                        </FormControl>

                        <Divider sx={{ my: 3 }} />

                        {settings.mode === 'browser' && (
                            <PrinterInstructions>
                                <Alert severity="info">
                                    Printer Bluetooth biasa sering tidak muncul
                                    di dialog Chrome. Aktifkan Print Service
                                    yang mendukung printer thermal ESC/POS.
                                </Alert>
                                <Button
                                    variant="outlined"
                                    startIcon={<LaunchRounded />}
                                    onClick={openAndroidPrintSettings}
                                >
                                    Buka pengaturan layanan cetak
                                </Button>
                            </PrinterInstructions>
                        )}

                        {settings.mode === 'rawbt' && (
                            <PrinterInstructions>
                                <Alert severity="info">
                                    Pair printer di pengaturan Bluetooth
                                    Android, lalu pilih printer tersebut di
                                    aplikasi RawBT.
                                </Alert>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1.25}
                                >
                                    <Button
                                        variant="outlined"
                                        startIcon={<BluetoothRounded />}
                                        onClick={openAndroidBluetoothSettings}
                                    >
                                        Buka Bluetooth
                                    </Button>
                                    <Button
                                        component="a"
                                        href={rawBtInstallUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        variant="outlined"
                                        startIcon={<LaunchRounded />}
                                    >
                                        Pasang RawBT
                                    </Button>
                                </Stack>
                            </PrinterInstructions>
                        )}

                        {settings.mode === 'web-bluetooth' && (
                            <PrinterInstructions>
                                <Alert severity="warning">
                                    Web Bluetooth tidak dapat melihat printer
                                    Bluetooth Classic. Jika C80BT tidak muncul
                                    pada pemilih perangkat, gunakan RawBT.
                                </Alert>
                                <Button
                                    variant="outlined"
                                    startIcon={<BluetoothRounded />}
                                    onClick={() => void connectBluetooth()}
                                    disabled={busy || !bluetoothAvailable}
                                >
                                    {settings.bluetoothDeviceName
                                        ? `Hubungkan ulang ${settings.bluetoothDeviceName}`
                                        : 'Pilih printer BLE'}
                                </Button>
                                {!bluetoothAvailable && (
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Browser ini tidak menyediakan Web
                                        Bluetooth.
                                    </Typography>
                                )}
                            </PrinterInstructions>
                        )}

                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            startIcon={<PrintRounded />}
                            onClick={() => void testPrint()}
                            disabled={busy}
                            sx={{ mt: 3 }}
                        >
                            {busy ? 'Memproses…' : 'Cetak tiket uji'}
                        </Button>
                    </CardContent>
                </Card>

                <Button
                    onClick={() => router.visit(queueTerminal.url())}
                    startIcon={<ArrowBackRounded />}
                    sx={{ mt: 2 }}
                >
                    Kembali ke terminal
                </Button>
                <Typography component="p" className="self-service-copyright">
                    © {new Date().getFullYear()} Antre by zainphp
                </Typography>
            </Container>
        </Box>
    );
}

function PrinterInstructions({ children }: { children: React.ReactNode }) {
    return <Stack spacing={2}>{children}</Stack>;
}
