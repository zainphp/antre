import CheckRounded from '@mui/icons-material/CheckRounded';
import DevicesOtherRounded from '@mui/icons-material/DevicesOtherRounded';
import PersonAddRounded from '@mui/icons-material/PersonAddRounded';
import RemoveCircleOutlineRounded from '@mui/icons-material/RemoveCircleOutlineRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { router, useForm } from '@inertiajs/react';
import { useEffect } from 'react';

import { AppShell } from '@/components/app-shell';
import { InertiaButton } from '@/components/inertia-button';
import admin from '@/routes/admin';
import echo from '@/services/echo';
import type { Device, DeviceRole } from '@/types/device';
import { formatTime } from '@/utils/format';

const roles: { value: DeviceRole; label: string }[] = [
    { value: 'DISPLAY', label: 'Layar display' },
    { value: 'QUEUE_TERMINAL', label: 'Terminal ambil nomor' },
    { value: 'OPERATOR_TERMINAL', label: 'Terminal operator' },
];

export default function Devices({ devices }: { devices: Device[] }) {
    useEffect(() => {
        const channel = echo.private('admin.devices');
        channel.listen('.device.changed', () =>
            router.reload({ only: ['devices'] }),
        );

        return () => {
            channel.stopListening('.device.changed');
            echo.leave('admin.devices');
        };
    }, []);

    return (
        <AppShell>
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
                            Tetapkan peran perangkat fisik tanpa menghapus
                            riwayat identitasnya.
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <InertiaButton
                            href={admin.settings.url()}
                            variant="outlined"
                            startIcon={<SettingsRounded />}
                        >
                            Pengaturan
                        </InertiaButton>
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
                                            key={device.id}
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
                                Buka halaman /pair pada terminal baru untuk
                                mendaftarkannya.
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Container>
        </AppShell>
    );
}

function DeviceRow({ device }: { device: Device }) {
    const form = useForm({
        name: device.name,
        role: device.role ?? ('DISPLAY' as DeviceRole),
    });
    const assigned = device.status === 'REGISTERED';

    return (
        <tr>
            <td>
                <Typography sx={{ fontWeight: 700 }}>{device.name}</Typography>
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
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <TextField
                        label={`Nama ${device.label}`}
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                        sx={{ minWidth: 150 }}
                    />
                    <TextField
                        select
                        label={`Peran ${device.label}`}
                        value={form.data.role}
                        onChange={(event) =>
                            form.setData(
                                'role',
                                event.target.value as DeviceRole,
                            )
                        }
                        sx={{ minWidth: 180 }}
                    >
                        {roles.map((role) => (
                            <MenuItem key={role.value} value={role.value}>
                                {role.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>
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
                </Stack>
            </td>
        </tr>
    );
}
