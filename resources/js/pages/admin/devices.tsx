import CheckRounded from '@mui/icons-material/CheckRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import DevicesOtherRounded from '@mui/icons-material/DevicesOtherRounded';
import PersonAddRounded from '@mui/icons-material/PersonAddRounded';
import RemoveCircleOutlineRounded from '@mui/icons-material/RemoveCircleOutlineRounded';
import StopCircleRounded from '@mui/icons-material/StopCircleRounded';
import TimerRounded from '@mui/icons-material/TimerRounded';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import { AdminLayout } from '@/components/admin-layout';
import admin from '@/routes/admin';
import echo from '@/services/echo';
import type { Device, DeviceRole } from '@/types/device';
import { formatTime } from '@/utils/format';

const roles: { value: DeviceRole; label: string }[] = [
    { value: 'DISPLAY', label: 'Layar display' },
    { value: 'QUEUE_TERMINAL', label: 'Terminal ambil nomor' },
    { value: 'OPERATOR_TERMINAL', label: 'Terminal operator' },
];

type PairingState = {
    open: boolean;
    expires_at: string | null;
    remaining_seconds: number;
};

export default function Devices({
    devices,
    pairing,
}: {
    devices: Device[];
    pairing: PairingState;
}) {
    const pairingForm = useForm({});
    const previousConnection = useRef(echo.connectionStatus());
    const [secondsRemaining, setSecondsRemaining] = useState(
        pairing.remaining_seconds,
    );

    useEffect(() => {
        const updateRemaining = () => {
            const expiresAt = pairing.expires_at
                ? Date.parse(pairing.expires_at)
                : NaN;

            setSecondsRemaining(
                Number.isNaN(expiresAt)
                    ? 0
                    : Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
            );
        };

        updateRemaining();
        const timer = window.setInterval(updateRemaining, 1000);

        return () => window.clearInterval(timer);
    }, [pairing.expires_at]);

    const pairingOpen = pairing.open && secondsRemaining > 0;

    useEffect(() => {
        const channel = echo.private('admin.devices');
        const reloadDevices = () =>
            router.reload({ only: ['devices', 'pairing'] });
        channel.listen('.device.changed', reloadDevices);
        const stopWatching = echo.connector.onConnectionChange((status) => {
            if (
                status === 'connected' &&
                previousConnection.current !== 'connected'
            ) {
                reloadDevices();
            }

            previousConnection.current = status;
        });
        const timer = window.setInterval(reloadDevices, 60000);

        return () => {
            channel.stopListening('.device.changed');
            echo.leave('admin.devices');
            stopWatching();
            window.clearInterval(timer);
        };
    }, []);

    return (
        <AdminLayout>
            <Head title="Perangkat" />
            <Container maxWidth="lg" className="admin-page">
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 2,
                        alignItems: 'flex-end',
                        mb: 4,
                    }}
                >
                    <Box>
                        <Typography className="eyebrow">
                            Administrator
                        </Typography>
                        <Typography
                            variant="h3"
                            component="h1"
                            sx={{ mt: 0.75 }}
                        >
                            Perangkat
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            Tetapkan satu atau beberapa peran tanpa menghapus
                            riwayat identitas perangkat. Cabut akses sebelum
                            menghapus perangkat lama.
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Button
                            variant={pairingOpen ? 'contained' : 'outlined'}
                            startIcon={
                                pairingOpen ? (
                                    <StopCircleRounded />
                                ) : (
                                    <TimerRounded />
                                )
                            }
                            disabled={pairingForm.processing}
                            onClick={() =>
                                pairingForm.post(
                                    (pairingOpen
                                        ? admin.devices.pairingSession.close
                                        : admin.devices.pairingSession
                                    ).url(),
                                    { preserveScroll: true },
                                )
                            }
                        >
                            {pairingOpen
                                ? `Tutup pairing · ${secondsRemaining} dtk`
                                : 'Buka pairing 60 detik'}
                        </Button>
                        <Chip
                            icon={<DevicesOtherRounded />}
                            label={`${devices.length} perangkat`}
                        />
                    </Stack>
                </Box>
                {devices.length ? (
                    <Card>
                        <CardContent sx={{ p: { xs: 1, md: 2 } }}>
                            <Box component="table" className="device-table">
                                <thead>
                                    <tr>
                                        <th>Perangkat</th>
                                        <th>Status</th>
                                        <th>Peran</th>
                                        <th>Terakhir terlihat</th>
                                        <th>Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devices.map((device) => (
                                        <DeviceRow
                                            key={`${device.id}:${device.name}:${device.roles.join(',')}:${device.status}`}
                                            device={device}
                                        />
                                    ))}
                                </tbody>
                            </Box>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent sx={{ p: 5, textAlign: 'center' }}>
                            <DevicesOtherRounded
                                color="primary"
                                sx={{ fontSize: 44 }}
                            />
                            <Typography
                                component="h2"
                                variant="h6"
                                sx={{ mt: 1 }}
                            >
                                Belum ada perangkat
                            </Typography>
                            <Typography color="text.secondary">
                                Buka sesi pairing selama 60 detik, lalu buka
                                halaman /pair pada terminal baru.
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Container>
        </AdminLayout>
    );
}

function DeviceRow({ device }: { device: Device }) {
    const form = useForm({
        name: device.name,
        roles: device.roles.length
            ? device.roles
            : (['DISPLAY'] as DeviceRole[]),
    });
    const assigned = device.status === 'REGISTERED';

    return (
        <tr>
            <td>
                <TextField
                    label="Nama perangkat"
                    value={form.data.name}
                    onChange={(event) =>
                        form.setData('name', event.target.value)
                    }
                    sx={{ minWidth: 180 }}
                />
                <Typography component="code" variant="body2">
                    {device.label}
                </Typography>
            </td>
            <td>
                <Chip
                    size="small"
                    color={
                        assigned
                            ? 'success'
                            : device.status === 'REVOKED'
                              ? 'error'
                              : 'warning'
                    }
                    label={
                        assigned
                            ? 'Terdaftar'
                            : device.status === 'REVOKED'
                              ? 'Dicabut'
                              : 'Menunggu'
                    }
                />
            </td>
            <td>
                <Autocomplete
                    multiple
                    options={roles}
                    value={roles.filter((role) =>
                        form.data.roles.includes(role.value),
                    )}
                    isOptionEqualToValue={(option, value) =>
                        option.value === value.value
                    }
                    getOptionLabel={(option) => option.label}
                    onChange={(_, values) =>
                        form.setData(
                            'roles',
                            values.map((role) => role.value),
                        )
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Peran"
                            error={Boolean(form.errors.roles)}
                            helperText={form.errors.roles}
                        />
                    )}
                    sx={{ minWidth: 250 }}
                />
            </td>
            <td>
                <Typography variant="body2">
                    {formatTime(device.last_seen_at)}
                </Typography>
            </td>
            <td>
                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={
                            assigned ? <CheckRounded /> : <PersonAddRounded />
                        }
                        disabled={form.processing}
                        onClick={() =>
                            form.patch(admin.devices.assign.url(device.id), {
                                preserveScroll: true,
                            })
                        }
                    >
                        {assigned ? 'Simpan' : 'Daftarkan'}
                    </Button>
                    {assigned && (
                        <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            startIcon={<RemoveCircleOutlineRounded />}
                            disabled={form.processing}
                            onClick={() =>
                                form.patch(
                                    admin.devices.revoke.url(device.id),
                                    { preserveScroll: true },
                                )
                            }
                        >
                            Cabut
                        </Button>
                    )}
                    {!assigned && (
                        <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            startIcon={<DeleteOutlineRounded />}
                            disabled={form.processing}
                            onClick={() => {
                                if (
                                    window.confirm(
                                        'Hapus ' +
                                            device.name +
                                            ' dari daftar perangkat?',
                                    )
                                ) {
                                    form.delete(
                                        admin.devices.destroy.url(device.id),
                                        { preserveScroll: true },
                                    );
                                }
                            }}
                        >
                            Hapus
                        </Button>
                    )}
                </Stack>
            </td>
        </tr>
    );
}
