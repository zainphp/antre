import DevicesOtherRounded from '@mui/icons-material/DevicesOtherRounded';
import SaveRounded from '@mui/icons-material/SaveRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

import { AppShell } from '@/components/app-shell';
import { InertiaButton } from '@/components/inertia-button';
import admin from '@/routes/admin';

export default function Settings({
    defaultPrefix,
    numberDigits,
}: {
    defaultPrefix: string | null;
    numberDigits: number;
}) {
    const form = useForm({
        default_prefix: defaultPrefix ?? '',
        number_digits: numberDigits,
    });
    const preview = `${form.data.default_prefix}${String(1).padStart(form.data.number_digits, '0')}`;

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.patch(admin.settings.update.url());
    };

    return (
        <AppShell>
            <Container maxWidth="md" className="admin-page">
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'flex-end' },
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 2,
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
                            Pengaturan antrian
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            Tentukan awalan dan jumlah digit untuk sesi antrian
                            berikutnya.
                        </Typography>
                    </Box>
                    <InertiaButton
                        href={admin.devices.url()}
                        variant="outlined"
                        startIcon={<DevicesOtherRounded />}
                    >
                        Perangkat
                    </InertiaButton>
                </Box>

                <Card>
                    <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                            <SettingsRounded color="primary" />
                            <Box>
                                <Typography component="h2" variant="h6">
                                    Format nomor
                                </Typography>
                                <Typography color="text.secondary">
                                    Gunakan 1–4 huruf atau angka sebagai prefix.
                                    Kosongkan jika nomor cukup berupa angka.
                                </Typography>
                            </Box>
                        </Box>

                        <Box
                            component="form"
                            onSubmit={submit}
                            sx={{ maxWidth: 520 }}
                        >
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                            >
                                <TextField
                                    fullWidth
                                    label="Prefix default"
                                    value={form.data.default_prefix}
                                    onChange={(event) =>
                                        form.setData(
                                            'default_prefix',
                                            event.target.value
                                                .toUpperCase()
                                                .replace(/[^A-Z0-9]/g, '')
                                                .slice(0, 4),
                                        )
                                    }
                                    error={Boolean(form.errors.default_prefix)}
                                    helperText={
                                        form.errors.default_prefix ??
                                        'Contoh nomor berikutnya: ' + preview
                                    }
                                    slotProps={{
                                        htmlInput: { maxLength: 4 },
                                    }}
                                />
                                <TextField
                                    label="Jumlah digit"
                                    type="number"
                                    value={form.data.number_digits}
                                    onChange={(event) =>
                                        form.setData(
                                            'number_digits',
                                            Number(event.target.value),
                                        )
                                    }
                                    error={Boolean(form.errors.number_digits)}
                                    helperText={
                                        form.errors.number_digits ??
                                        'Gunakan 1–6 digit. Default: 3.'
                                    }
                                    slotProps={{
                                        htmlInput: { min: 1, max: 6 },
                                    }}
                                    sx={{ width: { sm: 180 } }}
                                />
                            </Stack>
                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={<SaveRounded />}
                                disabled={form.processing}
                                sx={{ mt: 3 }}
                            >
                                {form.processing
                                    ? 'Menyimpan…'
                                    : 'Simpan pengaturan'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        </AppShell>
    );
}
