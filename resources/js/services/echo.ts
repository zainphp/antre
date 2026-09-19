import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const host = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
const port = Number(import.meta.env.VITE_REVERB_PORT || 8080);
const secure =
    (import.meta.env.VITE_REVERB_SCHEME ||
        window.location.protocol.replace(':', '')) === 'https';

const echo = new Echo<'reverb'>({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    Pusher,
    wsHost: host,
    wsPort: secure ? 80 : port,
    wssPort: secure ? port : 443,
    forceTLS: secure,
    enabledTransports: ['ws', 'wss'],
});

export default echo;
