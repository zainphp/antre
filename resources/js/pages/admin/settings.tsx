import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import SaveRounded from '@mui/icons-material/SaveRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

import { AdminLayout } from '@/components/admin-layout';
import admin from '@/routes/admin';
import type { FooterLink } from '@/types/footer-link';

const emptyFooterLink = (): FooterLink => ({ label: '', url: '' });

export default function Settings({
    brandName,
    sessionName,
    defaultPrefix,
    numberDigits,
    numberCounters,
    footerLinks,
}: {
    brandName: string;
    sessionName: string;
    defaultPrefix: string | null;
    numberDigits: number;
    numberCounters: number;
    footerLinks: FooterLink[];
}) {
    const form = useForm({
        brand_name: brandName,
        session_name: sessionName,
        default_prefix: defaultPrefix ?? '',
        number_digits: numberDigits,
        number_counters: numberCounters,
        footer_links: footerLinks,
    });
    const footerErrors = form.errors as Record<string, string | undefined>;
    const preview = `${form.data.default_prefix}${String(1).padStart(form.data.number_digits, '0')}`;

    const updateFooterLink = (
        index: number,
        field: keyof FooterLink,
        value: string,
    ): void => {
        form.setData(
            'footer_links',
            form.data.footer_links.map((link, linkIndex) =>
                linkIndex === index ? { ...link, [field]: value } : link,
            ),
        );
    };

    const removeFooterLink = (index: number): void => {
        form.setData(
            'footer_links',
            form.data.footer_links.filter(
                (_, linkIndex) => linkIndex !== index,
            ),
        );
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.patch(admin.settings.update.url());
    };

    return (
        <AdminLayout>
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
                            Pengaturan aplikasi
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            Atur identitas tampilan, format nomor, loket, dan
                            tautan publik.
                        </Typography>
                    </Box>
                </Box>

                <Card>
                    <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                            <SettingsRounded color="primary" />
                            <Box>
                                <Typography component="h2" variant="h6">
                                    Identitas tampilan
                                </Typography>
                                <Typography color="text.secondary">
                                    Nama ini tampil pada monitor publik,
                                    display, dan tiket antrian.
                                </Typography>
                            </Box>
                        </Box>

                        <Box
                            component="form"
                            onSubmit={submit}
                            sx={{ maxWidth: 720 }}
                        >
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
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
                                    helperText={
                                        form.errors.brand_name ??
                                        'Contoh: ANTRE'
                                    }
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
                                    helperText={
                                        form.errors.session_name ??
                                        'Contoh: Pelayanan Pelanggan'
                                    }
                                    slotProps={{
                                        htmlInput: { maxLength: 120 },
                                    }}
                                />
                            </Stack>

                            <Box
                                sx={{
                                    mt: 5,
                                    pt: 4,
                                    borderTop: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography component="h2" variant="h6">
                                    Format nomor
                                </Typography>
                                <Typography color="text.secondary">
                                    Gunakan 1–4 huruf atau angka sebagai prefix.
                                    Kosongkan jika nomor cukup berupa angka.
                                </Typography>

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
                                        error={Boolean(
                                            form.errors.default_prefix,
                                        )}
                                        helperText={
                                            form.errors.default_prefix ??
                                            'Contoh nomor berikutnya: ' +
                                                preview
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
                                        error={Boolean(
                                            form.errors.number_digits,
                                        )}
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
                            </Box>
                            <Box
                                sx={{
                                    mt: 5,
                                    pt: 4,
                                    borderTop: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography component="h2" variant="h6">
                                    Loket layanan
                                </Typography>
                                <Typography color="text.secondary">
                                    Tentukan jumlah loket yang tersedia untuk
                                    dipilih operator.
                                </Typography>
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
                                    sx={{
                                        mt: 2,
                                        width: { xs: '100%', sm: 180 },
                                    }}
                                />
                            </Box>
                            <Box
                                sx={{
                                    mt: 5,
                                    pt: 4,
                                    borderTop: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography component="h2" variant="h6">
                                    Tautan footer
                                </Typography>
                                <Typography color="text.secondary">
                                    Tautan ini tampil untuk pengunjung publik.
                                </Typography>

                                <Stack spacing={1.5} sx={{ mt: 2 }}>
                                    {form.data.footer_links.map(
                                        (link, index) => {
                                            const labelError =
                                                footerErrors[
                                                    'footer_links.' +
                                                        index +
                                                        '.label'
                                                ];
                                            const urlError =
                                                footerErrors[
                                                    'footer_links.' +
                                                        index +
                                                        '.url'
                                                ];

                                            return (
                                                <Stack
                                                    key={index}
                                                    direction={{
                                                        xs: 'column',
                                                        sm: 'row',
                                                    }}
                                                    spacing={1.5}
                                                    sx={{
                                                        alignItems: {
                                                            sm: 'flex-start',
                                                        },
                                                    }}
                                                >
                                                    <TextField
                                                        fullWidth
                                                        label="Nama link"
                                                        value={link.label}
                                                        onChange={(event) =>
                                                            updateFooterLink(
                                                                index,
                                                                'label',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        error={Boolean(
                                                            labelError,
                                                        )}
                                                        helperText={labelError}
                                                    />
                                                    <TextField
                                                        fullWidth
                                                        label="URL"
                                                        placeholder="https://"
                                                        value={link.url}
                                                        onChange={(event) =>
                                                            updateFooterLink(
                                                                index,
                                                                'url',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        error={Boolean(
                                                            urlError,
                                                        )}
                                                        helperText={urlError}
                                                    />
                                                    <IconButton
                                                        type="button"
                                                        aria-label={
                                                            'Hapus link ' +
                                                            (index + 1)
                                                        }
                                                        onClick={() =>
                                                            removeFooterLink(
                                                                index,
                                                            )
                                                        }
                                                        color="error"
                                                        sx={{
                                                            mt: {
                                                                sm: 0.5,
                                                            },
                                                        }}
                                                    >
                                                        <DeleteOutlineRounded />
                                                    </IconButton>
                                                </Stack>
                                            );
                                        },
                                    )}
                                </Stack>

                                <Button
                                    type="button"
                                    variant="outlined"
                                    startIcon={<AddRounded />}
                                    disabled={
                                        form.data.footer_links.length >= 5
                                    }
                                    onClick={() =>
                                        form.setData('footer_links', [
                                            ...form.data.footer_links,
                                            emptyFooterLink(),
                                        ])
                                    }
                                    sx={{ mt: 2 }}
                                >
                                    Tambah link
                                </Button>
                            </Box>

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
        </AdminLayout>
    );
}
