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

export default function Display({
    state,
    brandName,
}: {
    state: App.Data.Frontend.QueueStateData;
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
            <Box component="main" className="display-main" aria-live="polite">
                <Box className="display-main-heading">
                    <Box>
                        <Typography className="display-label">
                            Status loket
                        </Typography>
                        <Typography component="h2" className="display-title">
                            Nomor yang sedang dilayani
                        </Typography>
                    </Box>
                </Box>
                <Box
                    className="display-counter-grid"
                    data-counter-count={state.counters.length}
                    aria-label="Nomor pada setiap loket"
                >
                    {state.counters.map((counter) => {
                        const isLatest =
                            counter.current?.id === state.current?.id;

                        return (
                            <Box
                                component="article"
                                className={`display-counter-card ${counter.current ? 'has-current' : ''} ${isLatest ? 'is-latest' : ''}`}
                                key={counter.name}
                                aria-label={`${counter.name}: ${counter.current?.number ?? 'belum ada panggilan'}`}
                            >
                                <Typography className="display-counter-name">
                                    {counter.name}
                                </Typography>
                                <Typography
                                    className={`display-counter-number ${isLatest ? 'is-current' : ''}`}
                                    key={`${counter.name}:${counter.current?.id ?? 'empty'}:${counter.current?.called_at ?? ''}`}
                                >
                                    {counter.current?.number ?? '—'}
                                </Typography>
                                <Typography className="display-counter-status">
                                    {counter.current?.status === 'SERVING'
                                        ? 'Sedang dilayani'
                                        : counter.current
                                          ? 'Dipanggil'
                                          : 'Belum ada panggilan'}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
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
