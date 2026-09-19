export type QueueStatus =
    | 'WAITING'
    | 'CALLED'
    | 'SERVING'
    | 'COMPLETED'
    | 'SKIPPED';

export type QueueEntry = {
    id: string;
    number: string;
    status: QueueStatus;
    counter: string | null;
    created_at: string | null;
    called_at: string | null;
};

export type QueueState = {
    session: {
        date: string;
        service_name: string;
    };
    current: QueueEntry | null;
    waiting: QueueEntry[];
    stats: {
        total: number;
        waiting: number;
        completed: number;
        skipped: number;
    };
};
