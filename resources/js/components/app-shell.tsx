import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

type SharedProps = {
    flash: { success?: string; error?: string };
};

export function AppShell({ children }: { children: ReactNode }) {
    const { flash } = usePage().props as unknown as SharedProps;

    return (
        <Box className="app-shell">
            {(flash.success || flash.error) && (
                <Container maxWidth="lg" sx={{ pt: 2 }}>
                    <Alert severity={flash.error ? 'error' : 'success'}>
                        {flash.error ?? flash.success}
                    </Alert>
                </Container>
            )}
            <Box component="main" id="main-content">
                {children}
            </Box>
        </Box>
    );
}
