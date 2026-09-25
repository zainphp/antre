export type QueueStatus =
    | 'WAITING'
    | 'CALLED'
    | 'SERVING'
    | 'COMPLETED'
    | 'SKIPPED'
    | 'FORFEITED';

export type QueueEntry = {
    id: string;
    number: string;
    status: QueueStatus;
    counter: string | null;
    created_at: string | null;
    called_at: string | null;
    photo_url?: string;
};

type QueueCounter = {
    name: string;
    current: QueueEntry | null;
};

type QueueHistoryEntry = QueueEntry & {
    completed_at: string | null;
    forfeit_reason: string | null;
};

export type QueueState = {
    session: {
        date: string;
        service_name: string;
    };
    current: QueueEntry | null;
    counters: QueueCounter[];
    waiting: QueueEntry[];
    callable?: QueueEntry[];
    history?: QueueHistoryEntry[];
    stats: {
        total: number;
        waiting: number;
        completed: number;
        skipped: number;
        forfeited: number;
    };
};
