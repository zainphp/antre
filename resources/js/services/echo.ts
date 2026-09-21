import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const reverbHost = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
const reverbPort = Number(import.meta.env.VITE_REVERB_PORT || 8080);
const reverbSecure =
    (import.meta.env.VITE_REVERB_SCHEME ||
        window.location.protocol.replace(':', '')) === 'https';

const echo =
    import.meta.env.VITE_BROADCAST_CONNECTION === 'ably'
        ? new Echo<'pusher'>({
              broadcaster: 'pusher',
              cluster: 'ably',
              key: import.meta.env.VITE_ABLY_PUBLIC_KEY,
              Pusher,
              wsHost: 'realtime-pusher.ably.io',
              wsPort: 443,
              wssPort: 443,
              forceTLS: true,
              encrypted: true,
              disableStats: true,
              enabledTransports: ['ws', 'wss'],
          })
        : new Echo<'reverb'>({
              broadcaster: 'reverb',
              key: import.meta.env.VITE_REVERB_APP_KEY,
              Pusher,
              wsHost: reverbHost,
              wsPort: reverbSecure ? 80 : reverbPort,
              wssPort: reverbSecure ? reverbPort : 443,
              forceTLS: reverbSecure,
              enabledTransports: ['ws', 'wss'],
          });

export default echo;
