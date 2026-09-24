import BluetoothConnectedRounded from '@mui/icons-material/BluetoothConnectedRounded';
import BluetoothDisabledRounded from '@mui/icons-material/BluetoothDisabledRounded';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

export type BluetoothPrinterState =
    | 'CONNECTED'
    | 'DISCONNECTED'
    | 'RECONNECTING'
    | 'FAILED';

export function BluetoothPrinterBadge({
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
