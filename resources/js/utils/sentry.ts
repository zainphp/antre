export const isSentryEnabled =
    import.meta.env.PROD && Boolean(import.meta.env.VITE_SENTRY_DSN);
