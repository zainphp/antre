import type { Auth } from '@/types/auth';
import type { QueueState } from '@/types/queue';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            flash: { success?: string; error?: string };
            state?: QueueState;
            [key: string]: unknown;
        };
    }
}
