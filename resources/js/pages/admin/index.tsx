import DashboardRounded from '@mui/icons-material/DashboardRounded';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { AdminLayout } from '@/components/admin-layout';

export default function Admin() {
    return (
        <AdminLayout>
            <Container maxWidth="lg" className="admin-page">
                <Typography className="eyebrow">Administrator</Typography>
                <Typography variant="h3" component="h1" sx={{ mt: 0.75 }}>
                    Panel administrator
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Kelola perangkat dan pengaturan antrian dari satu tempat.
                </Typography>
                <Card sx={{ mt: 4 }}>
                    <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 2,
                            }}
                        >
                            <Box className="role-icon">
                                <DashboardRounded />
                            </Box>
                            <Box>
                                <Typography variant="h6" component="h2">
                                    Mulai dari menu samping
                                </Typography>
                                <Typography
                                    color="text.secondary"
                                    sx={{ mt: 1 }}
                                >
                                    Pilih Perangkat untuk mengatur terminal atau
                                    Pengaturan untuk menyesuaikan format nomor
                                    antrian.
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        </AdminLayout>
    );
}
