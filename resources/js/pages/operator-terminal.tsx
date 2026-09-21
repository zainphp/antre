import CallRounded from '@mui/icons-material/CallRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import DoneAllRounded from '@mui/icons-material/DoneAllRounded';
import EventBusyRounded from '@mui/icons-material/EventBusyRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import SkipNextRounded from '@mui/icons-material/SkipNextRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm, usePage } from '@inertiajs/react';

import { ConnectionBadge } from '@/components/connection-badge';
import { SectionHeading } from '@/components/section-heading';
import queue from '@/routes/queue';
import { useQueueRealtime } from '@/hooks/use-queue-realtime';
import type { QueueState, QueueStatus } from '@/types/queue';

const statusLabels: Record<QueueStatus, string> = {
    WAITING: 'Menunggu',
    CALLED: 'Dipanggil',
    SERVING: 'Sedang dilayani',
    COMPLETED: 'Selesai',
    SKIPPED: 'Dilewati',
};

export default function OperatorTerminal({
    state,
    counters,
}: {
    state: QueueState;
    counters: string[];
}) {
    const realtime = useQueueRealtime(state);
    state = realtime.state;
    const action = useForm({ counter: counters[0] ?? 'Loket 1' });
    const { errors } = usePage().props as unknown as {
        errors: { queue?: string };
    };

    const post = (url: string) => action.post(url, { preserveScroll: true });

    return (
        <Box component="main" className="operator-terminal-page">
            <Box className="page-topline">
                <Box>
                    <Typography className="eyebrow">Ruang operator</Typography>
                    <Typography variant="h3" component="h1" sx={{ mt: 0.75 }}>
                        Kelola antrian
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Panggil nomor berikutnya dan pastikan pelanggan mendapat
                        informasi yang jelas.
                    </Typography>
                </Box>
                <ConnectionBadge state={realtime.connection} />
            </Box>
            {errors.queue && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {errors.queue}
                </Alert>
            )}
            <Box className="operator-terminal-grid">
                <Card className="current-card">
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <Box className="current-card-head">
                            <Box>
                                <Typography className="eyebrow">
                                    Sedang dilayani
                                </Typography>
                                <Typography
                                    component="h2"
                                    variant="h5"
                                    sx={{ mt: 1 }}
                                >
                                    Nomor saat ini
                                </Typography>
                            </Box>
                            {state.current && (
                                <Chip
                                    className="current-status-chip"
                                    label={statusLabels[state.current.status]}
                                    variant="outlined"
                                />
                            )}
                        </Box>
                        <Typography className="current-number">
                            {state.current?.number ?? '— — —'}
                        </Typography>
                        <Typography className="current-counter">
                            {state.current?.counter ?? 'Belum ada nomor aktif'}
                        </Typography>
                        <Box className="call-row">
                            <TextField
                                select
                                label="Loket"
                                value={action.data.counter}
                                onChange={(event) =>
                                    action.setData(
                                        'counter',
                                        event.target.value,
                                    )
                                }
                                sx={{ minWidth: 145 }}
                            >
                                {counters.map((counter) => (
                                    <MenuItem key={counter} value={counter}>
                                        {counter}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Button
                                className="call-button"
                                variant="contained"
                                color="secondary"
                                startIcon={<CallRounded />}
                                disabled={
                                    action.processing || Boolean(state.current)
                                }
                                onClick={() => post(queue.callNext.url())}
                            >
                                Panggil berikutnya
                            </Button>
                        </Box>
                        <Stack
                            direction="row"
                            spacing={1}
                            className="current-actions"
                            sx={{ flexWrap: 'wrap' }}
                        >
                            <Button
                                variant="outlined"
                                className="display-control"
                                startIcon={<ReplayRounded />}
                                disabled={action.processing || !state.current}
                                onClick={() => post(queue.recall.url())}
                            >
                                Panggil ulang
                            </Button>
                            <Button
                                variant="outlined"
                                className="display-control"
                                startIcon={<CheckRounded />}
                                disabled={
                                    action.processing ||
                                    state.current?.status !== 'CALLED'
                                }
                                onClick={() => post(queue.serve.url())}
                            >
                                Mulai layani
                            </Button>
                            <Button
                                variant="outlined"
                                className="display-control"
                                startIcon={<DoneAllRounded />}
                                disabled={action.processing || !state.current}
                                onClick={() => post(queue.complete.url())}
                            >
                                Selesai
                            </Button>
                            <Button
                                variant="outlined"
                                color="warning"
                                className="display-control"
                                startIcon={<SkipNextRounded />}
                                disabled={action.processing || !state.current}
                                onClick={() => post(queue.skip.url())}
                            >
                                Lewati
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
                <Card className="waiting-card">
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <Box className="section-title-row">
                            <SectionHeading
                                eyebrow="Berikutnya"
                                title="Menunggu dipanggil"
                                detail="Urutan ditentukan server."
                            />
                            <Chip label={`${state.stats.waiting} nomor`} />
                        </Box>
                        {state.waiting.length ? (
                            <List className="waiting-list">
                                {state.waiting.map((entry, index) => (
                                    <ListItem
                                        key={entry.id}
                                        divider
                                        secondaryAction={
                                            <Typography color="text.secondary">
                                                #{index + 1}
                                            </Typography>
                                        }
                                    >
                                        <Typography sx={{ fontWeight: 700 }}>
                                            {entry.number}
                                        </Typography>
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Box className="empty-state">
                                <GroupsRounded />
                                <Typography sx={{ fontWeight: 700 }}>
                                    Antrian kosong
                                </Typography>
                                <Typography color="text.secondary">
                                    Nomor baru akan muncul di sini.
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>
            <Box className="operator-terminal-lower-grid">
                <Card>
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <SectionHeading
                            eyebrow="Ringkasan sesi"
                            title="Hari ini"
                        />
                        <Box className="stats-grid">
                            <Stat label="Total" value={state.stats.total} />
                            <Stat
                                label="Menunggu"
                                value={state.stats.waiting}
                            />
                            <Stat
                                label="Selesai"
                                value={state.stats.completed}
                            />
                            <Stat
                                label="Dilewati"
                                value={state.stats.skipped}
                            />
                        </Box>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <SectionHeading
                            eyebrow="Tindakan khusus"
                            title="Sesi antrian"
                        />
                        <Box className="device-empty">
                            <EventBusyRounded />
                            <Typography sx={{ fontWeight: 700 }}>
                                Mulai dari awal
                            </Typography>
                            <Typography color="text.secondary">
                                Gunakan reset setelah layanan hari ini
                                benar-benar selesai.
                            </Typography>
                            <Button
                                color="warning"
                                variant="outlined"
                                startIcon={<EventBusyRounded />}
                                disabled={
                                    action.processing ||
                                    Boolean(
                                        state.waiting.length || state.current,
                                    )
                                }
                                onClick={() => post(queue.reset.url())}
                            >
                                Reset sesi
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <Box className="stat-cell">
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography className="stat-value">{value}</Typography>
        </Box>
    );
}
