export {};

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: App.Data.Frontend.AuthData;
            flash: { success?: string; error?: string };
            state?: App.Data.Frontend.QueueStateData;
            [key: string]: unknown;
        };
    }
}
