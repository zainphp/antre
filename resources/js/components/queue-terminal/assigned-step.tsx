import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import PrintRounded from '@mui/icons-material/PrintRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState } from 'react';

const ASSIGNED_STEP_IDLE_TIMEOUT_MS = 30_000;
const PRINT_COOLDOWN_MS = 5_000;

export function AssignedStep({
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
