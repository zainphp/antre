import FullscreenRounded from '@mui/icons-material/FullscreenRounded';
import VolumeUpRounded from '@mui/icons-material/VolumeUpRounded';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

import { ConnectionBadge } from '@/components/connection-badge';
import { useQueueRealtime } from '@/hooks/use-queue-realtime';
import { announceQueue } from '@/services/speech';
import { formatDate } from '@/utils/format';
import type { QueueState } from '@/types/queue';

export default function Display({ state }: { state: QueueState }) {
    const realtime = useQueueRealtime(state);
    state = realtime.state;
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

    const enterFullscreen = () => {
        void document.documentElement.requestFullscreen?.();
    };

    return (
        <Box className="display-page">
            <Box component="header" className="display-header">
                <Box>
                    <Typography component="h1" className="display-brand">
                        ANTRE
                    </Typography>
                    <Typography className="display-subtitle">
                        {state.session.service_name}
                    </Typography>
                </Box>
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                >
                    <ConnectionBadge state={realtime.connection} />
                    <Button
                        className="display-control"
                        variant="outlined"
                        startIcon={<VolumeUpRounded />}
                        onClick={() => announceQueue(state.current)}
                    >
                        Panggil ulang
                    </Button>
                    <Button
                        className="display-control"
                        variant="outlined"
                        startIcon={<FullscreenRounded />}
                        onClick={enterFullscreen}
                    >
                        Layar penuh
                    </Button>
                </Stack>
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
                <Typography className="display-waiting">
                    {state.stats.waiting} nomor menunggu
                </Typography>
                <Typography className="display-hint">
                    Mohon perhatikan layar dan suara panggilan.
                </Typography>
            </Box>
            <Box component="footer" className="display-footer">
                <Typography>{formatDate(state.session.date)}</Typography>
                <Alert severity="info">Status diperbarui otomatis</Alert>
            </Box>
        </Box>
    );
}
