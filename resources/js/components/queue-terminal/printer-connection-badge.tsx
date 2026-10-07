import BluetoothConnectedRounded from '@mui/icons-material/BluetoothConnectedRounded';
import BluetoothDisabledRounded from '@mui/icons-material/BluetoothDisabledRounded';
import UsbRounded from '@mui/icons-material/UsbRounded';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

export type PrinterConnectionState =
    | 'CONNECTED'
    | 'DISCONNECTED'
    | 'RECONNECTING'
    | 'FAILED';

export function PrinterConnectionBadge({
    name,
    state,
    onReconnect,
    usb = false,
}: {
    name: string | null;
    state: PrinterConnectionState;
    onReconnect?: () => void;
    usb?: boolean;
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
                ) : usb ? (
                    <UsbRounded fontSize="small" />
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
