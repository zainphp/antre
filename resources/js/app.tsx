import { createInertiaApp } from '@inertiajs/react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client';
import type { ComponentType } from 'react';

import { theme } from '@/theme';
import { isSentryEnabled } from '@/utils/sentry';

import '../css/app.css';

const pages = import.meta.glob<{ default: ComponentType }>('./pages/**/*.tsx');
const appName = import.meta.env.VITE_APP_NAME || 'Antre';

if (isSentryEnabled) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment:
            import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
        release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
        tracesSampleRate: Number(
            import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0,
        ),
        sendDefaultPii: false,
    });
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        void navigator.serviceWorker.register('/sw.js');
    });
}

void createInertiaApp({
    title: (title) => (title ? `${title} — ${appName}` : appName),
    progress: { color: '#d4a854' },
    resolve: async (name) => {
        const page = pages[`./pages/${name}.tsx`];
        if (!page) {
            throw new Error(`Halaman Inertia tidak ditemukan: ${name}`);
        }

        return page().then((module) => module.default);
    },
    setup({ el, App, props }) {
        if (!el) {
            throw new Error('Root Inertia tidak ditemukan.');
        }

        createRoot(
            el,
            isSentryEnabled
                ? {
                      onCaughtError: Sentry.reactErrorHandler(),
                      onRecoverableError: Sentry.reactErrorHandler(),
                      onUncaughtError: Sentry.reactErrorHandler(),
                  }
                : {},
        ).render(
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <App {...props} />
            </ThemeProvider>,
        );
    },
    strictMode: true,
});
