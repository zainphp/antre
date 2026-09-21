import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { AdminSidebar } from '@/components/admin-sidebar';
import { AppShell } from '@/components/app-shell';

export function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <AppShell>
            <Box className="admin-layout">
                <AdminSidebar />
                <Box className="admin-content">{children}</Box>
            </Box>
        </AppShell>
    );
}
