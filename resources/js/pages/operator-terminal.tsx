import CallRounded from '@mui/icons-material/CallRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ConfirmationNumberRounded from '@mui/icons-material/ConfirmationNumberRounded';
import DoneAllRounded from '@mui/icons-material/DoneAllRounded';
import EventBusyRounded from '@mui/icons-material/EventBusyRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { ConnectionBadge } from '@/components/connection-badge';
import { SectionHeading } from '@/components/section-heading';
import { display, queueTerminal } from '@/routes';
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
    canOpenQueueTerminal,
    canOpenDisplay,
}: {
    state: QueueState;
    counters: string[];
    canOpenQueueTerminal: boolean;
    canOpenDisplay: boolean;
}) {
    const realtime = useQueueRealtime(state, { refreshOnEvent: true });
    state = realtime.state;
    const action = useForm({
        counter: counters[0] ?? 'Loket 1',
        entry_id: null as string | null,
    });
    const callableEntries = state.callable ?? [];
    const displayedEntry = state.current;
    const canRecall = Boolean(state.current);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const { errors } = usePage().props as unknown as {
        errors: { queue?: string };
    };

    useEffect(() => {
        if (!counters.includes(action.data.counter)) {
            action.setData('counter', counters[0] ?? 'Loket 1');
        }
    }, [action, counters]);

    const post = (url: string, entryId: string | null = null) => {
        action.transform((data) => ({ ...data, entry_id: entryId }));
        action.post(url, { preserveScroll: true });
    };

    return (
        <Box component="main" className="operator-terminal-page">
            <Head title="Operator" />
            <Box className="page-topline">
                <Box>
                    <Typography className="eyebrow">Ruang operator</Typography>
                    <Typography variant="h3" component="h1" sx={{ mt: 0.75 }}>
                        Kelola antrian
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Pilih nomor yang akan dipanggil dan pastikan pelanggan
                        mendapat informasi yang jelas.
                    </Typography>
                </Box>
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                        alignItems: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    {canOpenQueueTerminal && (
                        <Button
                            component="a"
                            href={queueTerminal.url()}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            size="small"
                            startIcon={<ConfirmationNumberRounded />}
                            endIcon={<OpenInNewRounded />}
                        >
                            Terminal nomor
                        </Button>
                    )}
                    {canOpenDisplay && (
                        <Button
                            component="a"
                            href={display.url()}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            size="small"
                            startIcon={<OpenInNewRounded />}
                        >
                            Display
                        </Button>
                    )}
                    <ConnectionBadge state={realtime.connection} />
                </Stack>
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
                            {displayedEntry && (
                                <Chip
                                    className="current-status-chip"
                                    label={statusLabels[displayedEntry.status]}
                                    variant="outlined"
                                />
                            )}
                        </Box>
                        <Box
                            className={`current-queue-focus ${displayedEntry?.photo_url ? 'has-photo' : ''}`}
                        >
                            {displayedEntry?.photo_url && (
                                <Box className="operator-photo-frame">
                                    <Box
                                        component="img"
                                        className="operator-customer-photo"
                                        src={displayedEntry.photo_url}
                                        alt={`Foto pelanggan nomor ${displayedEntry.number}`}
                                    />
                                </Box>
                            )}
                            <Box className="current-queue-copy">
                                <Typography className="current-number">
                                    {displayedEntry?.number ?? '— — —'}
                                </Typography>
                                <Typography className="current-counter">
                                    {state.current?.counter ??
                                        'Belum ada nomor aktif'}
                                </Typography>
                            </Box>
                        </Box>
                        {canRecall && (
                            <Button
                                className="display-control current-recall"
                                variant="outlined"
                                color="secondary"
                                startIcon={<ReplayRounded />}
                                disabled={action.processing}
                                onClick={() => post(queue.recall.url())}
                            >
                                Panggil ulang
                            </Button>
                        )}
                    </CardContent>
                </Card>
                <Card className="waiting-card">
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <Box className="section-title-row">
                            <SectionHeading
                                eyebrow="Belum selesai"
                                title="Nomor yang dapat dipanggil"
                                detail="Pilih nomor untuk memanggilnya."
                            />
                            <Chip label={`${callableEntries.length} nomor`} />
                        </Box>
                        <Box className="queue-counter-row">
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
                            <Typography variant="body2" color="text.secondary">
                                Pilih nomor pada daftar untuk memanggilnya.
                            </Typography>
                        </Box>
                        {callableEntries.length ? (
                            <List className="waiting-list">
                                {callableEntries.map((entry) => {
                                    const isCurrent =
                                        state.current?.id === entry.id;

                                    return (
                                        <ListItem
                                            key={entry.id}
                                            className={`waiting-entry ${isCurrent ? 'is-current' : ''}`}
                                            divider
                                            aria-current={
                                                isCurrent ? 'true' : undefined
                                            }
                                        >
                                            <Box className="waiting-entry-content">
                                                <Typography className="waiting-entry-number">
                                                    {entry.number}
                                                </Typography>
                                                <Typography className="waiting-entry-status">
                                                    {statusLabels[entry.status]}
                                                </Typography>
                                            </Box>
                                            <Box
                                                className={`waiting-entry-actions ${isCurrent ? 'is-current' : ''} ${isCurrent && entry.status !== 'CALLED' ? 'only-action' : ''}`}
                                            >
                                                {isCurrent && (
                                                    <Chip
                                                        label="Saat ini"
                                                        color="secondary"
                                                        size="small"
                                                    />
                                                )}
                                                {isCurrent &&
                                                    entry.status ===
                                                        'CALLED' && (
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={
                                                                <CheckRounded />
                                                            }
                                                            disabled={
                                                                action.processing
                                                            }
                                                            onClick={() =>
                                                                post(
                                                                    queue.serve.url(),
                                                                )
                                                            }
                                                        >
                                                            Mulai layani
                                                        </Button>
                                                    )}
                                                {isCurrent ? (
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={
                                                            <DoneAllRounded />
                                                        }
                                                        disabled={
                                                            action.processing
                                                        }
                                                        onClick={() =>
                                                            setCompleteDialogOpen(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        Selesai
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        className="waiting-call-button"
                                                        variant="outlined"
                                                        startIcon={
                                                            <CallRounded />
                                                        }
                                                        disabled={
                                                            action.processing
                                                        }
                                                        onClick={() =>
                                                            post(
                                                                queue.recall.url(),
                                                                entry.id,
                                                            )
                                                        }
                                                    >
                                                        Panggil
                                                    </Button>
                                                )}
                                            </Box>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        ) : (
                            <Box className="empty-state">
                                <GroupsRounded />
                                <Typography sx={{ fontWeight: 700 }}>
                                    Tidak ada nomor terbuka
                                </Typography>
                                <Typography color="text.secondary">
                                    Semua nomor sudah selesai dilayani.
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
            <Dialog
                open={completeDialogOpen}
                onClose={() => setCompleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Selesaikan nomor ini?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Nomor {state.current?.number ?? 'ini'} akan ditandai
                        selesai dan tidak dapat dipanggil kembali.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCompleteDialogOpen(false)}>
                        Batal
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<DoneAllRounded />}
                        disabled={action.processing}
                        onClick={() => {
                            setCompleteDialogOpen(false);
                            post(queue.complete.url());
                        }}
                    >
                        Selesaikan
                    </Button>
                </DialogActions>
            </Dialog>
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
