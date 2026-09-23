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

import { PrinterTestPreview } from '@/components/printer-test-preview';
import { queueTerminal } from '@/routes';
import {
    loadPrinterSettings,
    openAndroidBluetoothSettings,
    openAndroidPrintSettings,
    pairWebBluetoothPrinter,
    printPrinterTest,
    androidPrintInstallUrl,
    savePrinterSettings,
    supportsWebBluetooth,
    type PrintImageMode,
    type PrinterMode,
    type PrinterSettings,
} from '@/services/printer';

type Feedback = {
    severity: 'error' | 'info' | 'success';
    message: string;
};

export default function QueueTerminalSettings({
    brandName,
    sessionName,
}: {
    brandName: string;
    sessionName: string;
}) {
    const [settings, setSettings] = useState<PrinterSettings>(() =>
        loadPrinterSettings(),
    );
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [testCreatedAt, setTestCreatedAt] = useState(() =>
        new Date().toISOString(),
    );
    const bluetoothAvailable = supportsWebBluetooth();

    const updateSettings = (changes: Partial<PrinterSettings>): void => {
        const next = { ...settings, ...changes };
        setSettings(next);
        savePrinterSettings(next);
        setFeedback(null);
    };

    const connectBluetooth = async (): Promise<void> => {
        setBusy(true);
        setFeedback(null);

        try {
            const device = await pairWebBluetoothPrinter();
            updateSettings({
                mode: 'web-bluetooth',
                bluetoothDeviceId: device.id,
                bluetoothDeviceName: device.name,
            });
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

    const testPrint = async (imageMode: PrintImageMode): Promise<void> => {
        const createdAt = new Date().toISOString();
        setTestCreatedAt(createdAt);
        setBusy(true);
        setFeedback(null);

        try {
            await printPrinterTest(
                brandName,
                sessionName,
                imageMode,
                createdAt,
            );
            setFeedback({
                severity: 'success',
                message: 'Tes cetak sudah dikirim.',
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
                sx={{
                    maxWidth: '640px !important',
                    paddingBottom: { xs: 3, sm: 4 },
                    paddingTop: { xs: 2.5, sm: 3.5 },
                }}
            >
                <Box
                    className="self-service-header"
                    sx={{ alignItems: 'center', marginBottom: 2.25 }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography className="self-service-brand">
                            {brandName}
                        </Typography>
                        <Typography className="self-service-session">
                            {sessionName}
                        </Typography>
                        <Typography
                            component="h1"
                            sx={{
                                fontSize: { xs: '1.75rem', sm: '2.15rem' },
                                lineHeight: 1.1,
                                marginTop: 1,
                            }}
                        >
                            Pengaturan printer
                        </Typography>
                    </Box>
                    <Box
                        aria-hidden="true"
                        sx={{
                            alignItems: 'center',
                            backgroundColor: '#e4f1e8',
                            borderRadius: 2,
                            color: 'var(--green)',
                            display: 'flex',
                            flex: '0 0 auto',
                            height: 48,
                            justifyContent: 'center',
                            width: 48,
                        }}
                    >
                        <SettingsRounded />
                    </Box>
                </Box>

                {feedback && (
                    <Alert severity={feedback.severity} sx={{ mb: 2 }}>
                        {feedback.message}
                    </Alert>
                )}

                <Card
                    sx={{
                        border: '1px solid var(--line)',
                        borderRadius: 3,
                        boxShadow: '0 12px 30px rgba(18, 72, 59, 0.08)',
                    }}
                >
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Stack spacing={2.25}>
                            <Box>
                                <Typography variant="h6" component="h2">
                                    Cetak tiket
                                </Typography>
                                <Typography
                                    color="text.secondary"
                                    variant="body2"
                                    sx={{ mt: 0.5 }}
                                >
                                    Pengaturan hanya tersimpan di terminal ini.
                                </Typography>
                            </Box>

                            <FormControl fullWidth>
                                <Typography
                                    component="span"
                                    sx={{
                                        color: 'var(--muted)',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.08em',
                                        mb: 1,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Metode cetak
                                </Typography>
                                <RadioGroup
                                    aria-label="Metode cetak"
                                    value={settings.mode}
                                    onChange={(event) =>
                                        updateSettings({
                                            mode: event.target
                                                .value as PrinterMode,
                                        })
                                    }
                                    sx={{ gap: 1 }}
                                >
                                    <PrinterModeOption
                                        value="iframe"
                                        selected={settings.mode === 'iframe'}
                                        title="Dialog cetak (iframe)"
                                        description="Muat tiket di iframe tersembunyi lalu gunakan dialog cetak browser."
                                    />
                                    <PrinterModeOption
                                        value="window"
                                        selected={settings.mode === 'window'}
                                        title="Jendela tiket (native window.print)"
                                        description="Buka tiket di jendela baru lalu panggil native window.print()."
                                    />
                                    <PrinterModeOption
                                        value="android-intent"
                                        selected={
                                            settings.mode === 'android-intent'
                                        }
                                        title="Aplikasi cetak (intent)"
                                        description="Kirim tiket ke aplikasi Android yang mendukung perintah ESC/POS."
                                    />
                                    <PrinterModeOption
                                        value="web-bluetooth"
                                        selected={
                                            settings.mode === 'web-bluetooth'
                                        }
                                        title="Web Bluetooth (BLE)"
                                        description="Untuk printer Bluetooth LE yang mendukung cetak."
                                        disabled={!bluetoothAvailable}
                                    />
                                </RadioGroup>
                            </FormControl>

                            <Divider />

                            <FormControl fullWidth>
                                <Typography
                                    component="span"
                                    sx={{
                                        color: 'var(--muted)',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.08em',
                                        mb: 0.5,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Lebar kertas thermal
                                </Typography>
                                <Typography
                                    color="text.secondary"
                                    variant="body2"
                                    sx={{ mb: 0.75 }}
                                >
                                    Ukuran umum roll printer: 58 mm atau 80 mm.
                                </Typography>
                                <RadioGroup
                                    aria-label="Lebar kertas thermal"
                                    row
                                    value={String(settings.paperWidth)}
                                    onChange={(event) =>
                                        updateSettings({
                                            paperWidth:
                                                event.target.value === '80'
                                                    ? 80
                                                    : 58,
                                        })
                                    }
                                    sx={{ gap: { xs: 1, sm: 2 } }}
                                >
                                    <FormControlLabel
                                        value="58"
                                        control={<Radio size="small" />}
                                        label="58 mm (57/58)"
                                        sx={{ margin: 0, minHeight: 48 }}
                                    />
                                    <FormControlLabel
                                        value="80"
                                        control={<Radio size="small" />}
                                        label="80 mm"
                                        sx={{ margin: 0, minHeight: 48 }}
                                    />
                                </RadioGroup>
                            </FormControl>

                            <Divider />

                            {settings.mode === 'window' && (
                                <PrinterInstructions>
                                    <Alert severity="info">
                                        Tiket dibuka di jendela baru. Browser
                                        akan menjalankan native window.print().
                                    </Alert>
                                </PrinterInstructions>
                            )}

                            {settings.mode === 'iframe' && (
                                <PrinterInstructions>
                                    <Alert severity="info">
                                        Tiket dimuat di iframe tersembunyi, lalu
                                        browser membuka dialog cetak standarnya.
                                    </Alert>
                                    <Button
                                        variant="outlined"
                                        startIcon={<LaunchRounded />}
                                        onClick={openAndroidPrintSettings}
                                    >
                                        Buka pengaturan cetak
                                    </Button>
                                </PrinterInstructions>
                            )}

                            {settings.mode === 'android-intent' && (
                                <PrinterInstructions>
                                    <Alert severity="info">
                                        Hubungkan perangkat di pengaturan
                                        Bluetooth Android, lalu pilih aplikasi
                                        cetak yang mendukung perintah ESC/POS.
                                    </Alert>
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={1}
                                    >
                                        <Button
                                            variant="outlined"
                                            startIcon={<BluetoothRounded />}
                                            onClick={
                                                openAndroidBluetoothSettings
                                            }
                                        >
                                            Buka Bluetooth
                                        </Button>
                                        <Button
                                            component="a"
                                            href={androidPrintInstallUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            variant="outlined"
                                            startIcon={<LaunchRounded />}
                                        >
                                            Pasang aplikasi cetak
                                        </Button>
                                    </Stack>
                                </PrinterInstructions>
                            )}

                            {settings.mode === 'web-bluetooth' && (
                                <PrinterInstructions>
                                    <Alert severity="warning">
                                        Web Bluetooth hanya mendukung perangkat
                                        BLE. Jika perangkat tidak muncul, pilih
                                        aplikasi cetak Android atau metode
                                        browser.
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

                            <Box>
                                <Typography variant="subtitle1">
                                    Mode foto tiket
                                </Typography>
                                <Typography
                                    color="text.secondary"
                                    variant="body2"
                                    sx={{ mt: 0.5, mb: 1.25 }}
                                >
                                    Pilih mode foto yang disimpan di terminal
                                    ini. Gunakan tombol tes untuk melihat
                                    hasilnya sebelum mencetak tiket.
                                </Typography>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1}
                                >
                                    {(
                                        [
                                            ['full-color', 'Warna penuh'],
                                            ['grayscale', 'Grayscale'],
                                            ['black-and-white', 'Hitam putih'],
                                        ] as const
                                    ).map(([value, label]) => (
                                        <Button
                                            key={value}
                                            fullWidth
                                            variant={
                                                settings.imageMode === value
                                                    ? 'contained'
                                                    : 'outlined'
                                            }
                                            onClick={() =>
                                                updateSettings({
                                                    imageMode: value,
                                                })
                                            }
                                            disabled={busy}
                                            sx={{ minHeight: 52 }}
                                        >
                                            {label}
                                        </Button>
                                    ))}
                                </Stack>
                                <PrinterTestPreview
                                    brandName={brandName}
                                    createdAt={testCreatedAt}
                                    imageMode={settings.imageMode}
                                    paperWidth={settings.paperWidth}
                                    sessionName={sessionName}
                                />
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<PrintRounded />}
                                    onClick={() =>
                                        void testPrint(settings.imageMode)
                                    }
                                    disabled={busy}
                                    sx={{ minHeight: 52, mt: 1.5 }}
                                >
                                    {busy ? 'Memproses…' : 'Cetak foto uji'}
                                </Button>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                <Button
                    onClick={() => router.visit(queueTerminal.url())}
                    startIcon={<ArrowBackRounded />}
                    sx={{ minHeight: 48, mt: 1.25 }}
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

function PrinterModeOption({
    value,
    selected,
    title,
    description,
    disabled = false,
}: {
    value: PrinterMode;
    selected: boolean;
    title: string;
    description: string;
    disabled?: boolean;
}) {
    return (
        <FormControlLabel
            value={value}
            disabled={disabled}
            control={<Radio size="small" />}
            label={
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 750, lineHeight: 1.3 }}>
                        {title}
                    </Typography>
                    <Typography
                        color="text.secondary"
                        variant="body2"
                        sx={{ lineHeight: 1.35, mt: 0.25 }}
                    >
                        {description}
                    </Typography>
                </Box>
            }
            sx={{
                alignItems: 'flex-start',
                border: '1px solid',
                borderColor: selected ? 'var(--green)' : 'var(--line)',
                borderRadius: 2,
                margin: 0,
                minHeight: 64,
                padding: '9px 10px',
                '& .MuiFormControlLabel-label': { flex: 1 },
                '& .MuiRadio-root': { padding: '2px 8px 2px 0' },
            }}
        />
    );
}

function PrinterInstructions({ children }: { children: React.ReactNode }) {
    return <Stack spacing={1.25}>{children}</Stack>;
}
