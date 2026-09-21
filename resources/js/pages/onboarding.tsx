import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Head, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

import { AppShell } from '@/components/app-shell';
import onboarding from '@/routes/onboarding';

type OnboardingDefaults = {
    brandName: string;
    sessionName: string;
    defaultPrefix: string | null;
    numberDigits: number;
    numberCounters: number;
};

export default function Onboarding({
    defaults,
}: {
    defaults: OnboardingDefaults;
}) {
    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        brand_name: defaults.brandName,
        session_name: defaults.sessionName,
        default_prefix: defaults.defaultPrefix ?? '',
        number_digits: defaults.numberDigits,
        number_counters: defaults.numberCounters,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(onboarding.store.url(), {
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    };

    return (
        <AppShell>
            <Head title="Pengaturan awal" />
            <Container maxWidth="md" className="onboarding-page">
                <Card>
                    <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                            <Box className="role-icon">
                                <AdminPanelSettingsRounded />
                            </Box>
                            <Box>
                                <Typography className="eyebrow">
                                    Pengaturan awal
                                </Typography>
                                <Typography
                                    variant="h3"
                                    component="h1"
                                    sx={{ mt: 0.5 }}
                                >
                                    Siapkan Antre
                                </Typography>
                                <Typography
                                    color="text.secondary"
                                    sx={{ mt: 1 }}
                                >
                                    Buat administrator pertama dan atur
                                    identitas layanan sebelum mulai digunakan.
                                </Typography>
                            </Box>
                        </Box>

                        {form.hasErrors && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                Periksa kembali isian yang ditandai.
                            </Alert>
                        )}

                        <Box component="form" onSubmit={submit}>
                            <Typography component="h2" variant="h6">
                                Akun administrator
                            </Typography>
                            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                Akun ini digunakan untuk mengelola perangkat dan
                                pengaturan Antre.
                            </Typography>
                            <Stack spacing={2} sx={{ mt: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Nama"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    autoComplete="name"
                                    autoFocus
                                    error={Boolean(form.errors.name)}
                                    helperText={form.errors.name}
                                />
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) =>
                                        form.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                    autoComplete="email"
                                    error={Boolean(form.errors.email)}
                                    helperText={form.errors.email}
                                />
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            sm: '1fr 1fr',
                                        },
                                        gap: 2,
                                    }}
                                >
                                    <TextField
                                        fullWidth
                                        label="Kata sandi"
                                        type="password"
                                        value={form.data.password}
                                        onChange={(event) =>
                                            form.setData(
                                                'password',
                                                event.target.value,
                                            )
                                        }
                                        autoComplete="new-password"
                                        error={Boolean(form.errors.password)}
                                        helperText={form.errors.password}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Ulangi kata sandi"
                                        type="password"
                                        value={form.data.password_confirmation}
                                        onChange={(event) =>
                                            form.setData(
                                                'password_confirmation',
                                                event.target.value,
                                            )
                                        }
                                        autoComplete="new-password"
                                        error={Boolean(
                                            form.errors.password_confirmation,
                                        )}
                                        helperText={
                                            form.errors.password_confirmation
                                        }
                                    />
                                </Box>
                            </Stack>

                            <Divider sx={{ my: 4 }} />

                            <Typography component="h2" variant="h6">
                                Identitas layanan
                            </Typography>
                            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                Nama ini tampil pada monitor publik, display,
                                dan tiket antrian.
                            </Typography>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: '1fr 1fr',
                                    },
                                    gap: 2,
                                    mt: 2,
                                }}
                            >
                                <TextField
                                    fullWidth
                                    label="Nama brand"
                                    value={form.data.brand_name}
                                    onChange={(event) =>
                                        form.setData(
                                            'brand_name',
                                            event.target.value,
                                        )
                                    }
                                    error={Boolean(form.errors.brand_name)}
                                    helperText={form.errors.brand_name}
                                    slotProps={{
                                        htmlInput: { maxLength: 80 },
                                    }}
                                />
                                <TextField
                                    fullWidth
                                    label="Nama sesi"
                                    value={form.data.session_name}
                                    onChange={(event) =>
                                        form.setData(
                                            'session_name',
                                            event.target.value,
                                        )
                                    }
                                    error={Boolean(form.errors.session_name)}
                                    helperText={form.errors.session_name}
                                    slotProps={{
                                        htmlInput: { maxLength: 120 },
                                    }}
                                />
                            </Box>

                            <Divider sx={{ my: 4 }} />

                            <Typography component="h2" variant="h6">
                                Format antrian
                            </Typography>
                            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                Prefix boleh dikosongkan. Nomor tanpa prefix
                                langsung dimulai dari angka.
                            </Typography>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: '1fr 1fr',
                                    },
                                    gap: 2,
                                    mt: 2,
                                }}
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
                                        'Contoh: A atau B2. Kosongkan jika tidak diperlukan.'
                                    }
                                    slotProps={{
                                        htmlInput: { maxLength: 4 },
                                    }}
                                />
                                <TextField
                                    fullWidth
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
                                />
                            </Box>
                            <TextField
                                label="Jumlah loket"
                                type="number"
                                value={form.data.number_counters}
                                onChange={(event) =>
                                    form.setData(
                                        'number_counters',
                                        Number(event.target.value),
                                    )
                                }
                                error={Boolean(form.errors.number_counters)}
                                helperText={
                                    form.errors.number_counters ??
                                    'Gunakan 1–20 loket. Default: 1.'
                                }
                                slotProps={{
                                    htmlInput: { min: 1, max: 20 },
                                }}
                                sx={{ mt: 2, width: { xs: '100%', sm: 220 } }}
                            />

                            <Button
                                fullWidth
                                type="submit"
                                variant="contained"
                                disabled={form.processing}
                                sx={{ mt: 4 }}
                            >
                                {form.processing
                                    ? 'Menyiapkan Antre…'
                                    : 'Mulai menggunakan Antre'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        </AppShell>
    );
}
