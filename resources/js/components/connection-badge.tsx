import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import SyncRounded from '@mui/icons-material/SyncRounded';
import { Chip } from '@mui/material';

export type ConnectionState =
    | 'CONNECTED'
    | 'DISCONNECTED'
    | 'RECONNECTING'
    | 'FAILED';

const content: Record<
    ConnectionState,
    {
        label: string;
        color: 'success' | 'warning' | 'error';
        icon: React.ReactElement;
    }
> = {
    CONNECTED: {
        label: 'Terhubung',
        color: 'success',
        icon: <CheckCircleRounded fontSize="small" />,
    },
    DISCONNECTED: {
        label: 'Terputus',
        color: 'error',
        icon: <ErrorOutlineRounded fontSize="small" />,
    },
    RECONNECTING: {
        label: 'Menyambung lagi',
        color: 'warning',
        icon: <SyncRounded fontSize="small" />,
    },
    FAILED: {
        label: 'Koneksi gagal',
        color: 'error',
        icon: <ErrorOutlineRounded fontSize="small" />,
    },
};

export function ConnectionBadge({ state }: { state: ConnectionState }) {
    const item = content[state];

    return (
        <Chip
            size="small"
            icon={item.icon}
            label={item.label}
            color={item.color}
            variant={state === 'CONNECTED' ? 'filled' : 'outlined'}
        />
    );
}
