import DashboardRounded from '@mui/icons-material/DashboardRounded';
import DevicesOtherRounded from '@mui/icons-material/DevicesOtherRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MonitorHeartRounded from '@mui/icons-material/MonitorHeartRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { Link, usePage } from '@inertiajs/react';

import { InertiaButton } from '@/components/inertia-button';
import admin from '@/routes/admin';
import { logout } from '@/routes';

const navigation = [
    {
        href: admin.index.url(),
        label: 'Ringkasan',
        description: 'Ikhtisar administrasi',
        icon: <DashboardRounded />,
    },
    {
        href: admin.devices.url(),
        label: 'Perangkat',
        description: 'Kelola terminal terdaftar',
        icon: <DevicesOtherRounded />,
    },
    {
        href: admin.settings.url(),
        label: 'Pengaturan',
        description: 'Atur format nomor antrian',
        icon: <SettingsRounded />,
    },
    {
        href: admin.integrations.url(),
        label: 'Integrasi',
        description: 'Uji layanan Sentry dan realtime',
        icon: <MonitorHeartRounded />,
    },
];

export function AdminSidebar() {
    const currentPath = usePage().url.split('?')[0];

    return (
        <Card component="aside" className="admin-sidebar">
            <CardContent sx={{ p: 2 }}>
                <Typography className="eyebrow">Antre</Typography>
                <Typography variant="h6" component="p" sx={{ mt: 0.5 }}>
                    Administrator
                </Typography>
                <Typography
                    color="text.secondary"
                    variant="body2"
                    sx={{ mt: 0.75 }}
                >
                    Kelola perangkat dan layanan.
                </Typography>
                <Divider sx={{ my: 2 }} />
                <List
                    component="nav"
                    aria-label="Navigasi administrator"
                    disablePadding
                >
                    {navigation.map((item) => (
                        <ListItemButton
                            key={item.href}
                            LinkComponent={Link}
                            href={item.href}
                            selected={currentPath === item.href}
                            sx={{
                                alignItems: 'flex-start',
                                borderRadius: 2,
                                mb: 0.5,
                                '&.Mui-selected': {
                                    backgroundColor: '#e5f0e8',
                                    color: 'var(--green)',
                                },
                                '&.Mui-selected:hover': {
                                    backgroundColor: '#d9e9de',
                                },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    color: 'inherit',
                                    minWidth: 36,
                                    mt: 0.25,
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                secondary={item.description}
                                slotProps={{
                                    primary: { sx: { fontWeight: 700 } },
                                    secondary: { sx: { fontSize: '0.75rem' } },
                                }}
                            />
                        </ListItemButton>
                    ))}
                </List>
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid var(--line)' }}>
                    <InertiaButton
                        href={logout.url()}
                        method="post"
                        fullWidth
                        variant="outlined"
                        color="inherit"
                        startIcon={<LogoutRounded />}
                        sx={{
                            justifyContent: 'flex-start',
                            color: 'var(--muted)',
                            borderColor: 'var(--line)',
                        }}
                    >
                        Keluar
                    </InertiaButton>
                </Box>
            </CardContent>
        </Card>
    );
}
