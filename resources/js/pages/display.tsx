import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Head } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

import { ConnectionBadge } from '@/components/connection-badge';
import { useQueueRealtime } from '@/hooks/use-queue-realtime';
import { home } from '@/routes';
import { announceQueue } from '@/services/speech';
import { formatDate } from '@/utils/format';
import type { QueueState } from '@/types/queue';

export default function Display({
    state,
    brandName,
}: {
    state: QueueState;
    brandName: string;
}) {
    const realtime = useQueueRealtime(state);
    state = realtime.state;
    const publicMonitorUrl = new URL(home.url(), window.location.origin).href;
    const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(
        null,
    );

    useEffect(() => {
        const announcement = state.current
            ? `${state.current.id}:${state.current.called_at ?? ''}`
            : null;

        if (announcement && announcement !== lastAnnouncement) {
            setLastAnnouncement(announcement);
            announceQueue(state.current);
        }
    }, [lastAnnouncement, state.current]);

    return (
        <Box className="display-page">
            <Head title="Display Antrian" />
            <Box component="header" className="display-header">
                <Box>
                    <Typography component="h1" className="display-brand">
                        {brandName}
                    </Typography>
                    <Typography className="display-subtitle">
                        {state.session.service_name}
                    </Typography>
                </Box>
                <ConnectionBadge state={realtime.connection} />
            </Box>
            <Box component="main" className="display-center" aria-live="polite">
                <Typography className="display-label">
                    Nomor yang dipanggil
                </Typography>
                <Typography
                    className={`display-number ${state.current ? 'is-current' : ''}`}
                    key={state.current?.id ?? 'empty'}
                >
                    {state.current?.number ?? '— — —'}
                </Typography>
                <Typography className="display-counter">
                    {state.current?.counter ?? 'Menunggu panggilan berikutnya'}
                </Typography>
            </Box>
            <Box component="footer" className="display-footer">
                <Box className="display-footer-info">
                    <Typography className="display-waiting">
                        Sisa Antrian: {state.stats.waiting}
                    </Typography>
                    <Typography>{formatDate(state.session.date)}</Typography>
                </Box>
                <Box
                    className="display-public-monitor"
                    role="img"
                    aria-label="Pindai QR code untuk memantau antrean dari ponsel"
                >
                    <Typography>Pantau dari ponsel</Typography>
                    <QRCodeSVG
                        value={publicMonitorUrl}
                        size={112}
                        level="M"
                        marginSize={2}
                        title="Pantau antrean dari ponsel"
                    />
                </Box>
            </Box>
        </Box>
    );
}
