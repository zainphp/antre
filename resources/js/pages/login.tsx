import LockRounded from '@mui/icons-material/LockRounded';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Container,
    FormControlLabel,
    TextField,
    Typography,
} from '@mui/material';
import { useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

import { AppShell } from '@/components/app-shell';
import { InertiaButton } from '@/components/inertia-button';
import { home } from '@/routes';
import login from '@/routes/login';

export default function Login() {
    const form = useForm({ email: '', password: '', remember: false });
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(login.store.url(), {
            onFinish: () => form.reset('password'),
        });
    };

    return (
        <AppShell>
            <Container maxWidth="sm" className="login-page">
                <Card>
                    <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                        <Box className="role-icon">
                            <LockRounded />
                        </Box>
                        <Typography className="eyebrow" sx={{ mt: 3 }}>
                            Akses internal
                        </Typography>
                        <Typography variant="h3" component="h1" sx={{ mt: 1 }}>
                            Masuk ke Antre
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                            Gunakan akun administrator atau operator untuk
                            mengelola layanan.
                        </Typography>
                        {form.errors.email && (
                            <Alert severity="error" sx={{ mt: 3 }}>
                                {form.errors.email}
                            </Alert>
                        )}
                        <Box component="form" onSubmit={submit} sx={{ mt: 3 }}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                                autoComplete="email"
                                error={Boolean(form.errors.email)}
                            />
                            <TextField
                                fullWidth
                                label="Kata sandi"
                                type="password"
                                value={form.data.password}
                                onChange={(event) =>
                                    form.setData('password', event.target.value)
                                }
                                autoComplete="current-password"
                                error={Boolean(form.errors.password)}
                                helperText={form.errors.password}
                                sx={{ mt: 2 }}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={form.data.remember}
                                        onChange={(event) =>
                                            form.setData(
                                                'remember',
                                                event.target.checked,
                                            )
                                        }
                                    />
                                }
                                label="Ingat saya"
                                sx={{ mt: 1 }}
                            />
                            <Button
                                fullWidth
                                type="submit"
                                variant="contained"
                                disabled={form.processing}
                                sx={{ mt: 2 }}
                            >
                                {form.processing ? 'Memproses…' : 'Masuk'}
                            </Button>
                        </Box>
                        <InertiaButton
                            href={home.url()}
                            variant="text"
                            sx={{ mt: 2 }}
                        >
                            Kembali ke beranda
                        </InertiaButton>
                    </CardContent>
                </Card>
            </Container>
        </AppShell>
    );
}
