import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { ConnectionBadge } from '@/components/connection-badge';
import { useQueueRealtime } from '@/hooks/use-queue-realtime';
import type { FooterLink } from '@/types/footer-link';
import type { QueueState } from '@/types/queue';
import { formatDate } from '@/utils/format';

export default function Welcome({
    state,
    footerLinks,
}: {
    state: QueueState;
    footerLinks: FooterLink[];
}) {
    const realtime = useQueueRealtime(state);
    const queue = realtime.state;
    const visibleWaiting = queue.waiting.slice(0, 8);
    const remainingWaiting = queue.waiting.length - visibleWaiting.length;

    return (
        <Box component="main" className="public-queue-page">
            <Container maxWidth="md" className="public-queue-content">
                <Box component="header" className="public-queue-header">
                    <Box>
                        <Typography
                            component="h1"
                            className="public-queue-brand"
                        >
                            ANTRE
                        </Typography>
                        <Typography className="public-queue-service">
                            {queue.session.service_name}
                        </Typography>
                        <Typography className="public-queue-date">
                            {formatDate(queue.session.date)}
                        </Typography>
                    </Box>
                    <ConnectionBadge state={realtime.connection} />
                </Box>

                <Box className="public-queue-current" aria-live="polite">
                    <Typography className="public-queue-label">
                        Sedang dipanggil
                    </Typography>
                    <Typography
                        className={`public-queue-number ${queue.current ? 'is-current' : 'is-empty'}`}
                        key={queue.current?.id ?? 'empty'}
                    >
                        {queue.current?.number ?? '—'}
                    </Typography>
                    <Typography className="public-queue-counter">
                        {queue.current?.counter ?? 'Menunggu panggilan'}
                    </Typography>
                </Box>

                <Box
                    component="section"
                    className="public-queue-waiting"
                    aria-labelledby="public-queue-waiting-title"
                >
                    <Box className="public-queue-section-heading">
                        <Typography
                            component="h2"
                            id="public-queue-waiting-title"
                        >
                            Nomor berikutnya
                        </Typography>
                        <Typography color="text.secondary">
                            {queue.stats.waiting} menunggu
                        </Typography>
                    </Box>

                    {visibleWaiting.length ? (
                        <Box className="public-queue-list">
                            {visibleWaiting.map((entry) => (
                                <Typography
                                    component="span"
                                    className="public-queue-entry"
                                    key={entry.id}
                                >
                                    {entry.number}
                                </Typography>
                            ))}
                        </Box>
                    ) : (
                        <Typography className="public-queue-empty">
                            Tidak ada nomor yang menunggu.
                        </Typography>
                    )}

                    {remainingWaiting > 0 && (
                        <Typography
                            className="public-queue-more"
                            color="text.secondary"
                        >
                            +{remainingWaiting} nomor berikutnya
                        </Typography>
                    )}
                </Box>

                <Box component="footer" className="public-queue-footer">
                    {footerLinks.length > 0 && (
                        <Box className="public-queue-footer-links">
                            {footerLinks.map((link) => (
                                <a
                                    key={link.url}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </Box>
                    )}
                    <Typography component="p">
                        © {new Date().getFullYear()} Antre by zainphp
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}
