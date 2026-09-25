declare namespace App {
    namespace Data {
        namespace Frontend {
            export type AuthData = {
                user: App.Data.Frontend.AuthUserData | null;
            };
            export type AuthUserData = {
                id: number;
                name: string;
                email: string;
                role: App.Enums.UserRole;
            };
            export type DeviceData = {
                id: string;
                label: string;
                name: string;
                roles: App.Enums.DeviceRole[];
                role_labels: string[];
                status: App.Enums.DeviceStatus;
                registered_at: string | null;
                last_seen_at: string | null;
                revoked_at: string | null;
            };
            export type FooterLinkData = {
                label: string;
                url: string;
            };
            export type PairDeviceData = {
                id: string;
                label: string;
                roles: App.Enums.DeviceRole[];
                role_labels: string[];
                status: App.Enums.DeviceStatus;
            };
            export type QueueCounterData = {
                name: string;
                current: App.Data.Frontend.QueueEntryData | null;
            };
            export type QueueEntryData = {
                id: string;
                number: string;
                status: App.Enums.QueueStatus;
                counter: string | null;
                created_at: string | null;
                called_at: string | null;
                photo_url?: string;
            };
            export type QueueHistoryEntryData = {
                completed_at: string | null;
                forfeit_reason: string | null;
                id: string;
                number: string;
                status: App.Enums.QueueStatus;
                counter: string | null;
                created_at: string | null;
                called_at: string | null;
                photo_url?: string;
            };
            export type QueueSessionData = {
                date: string;
                service_name: string;
            };
            export type QueueStateData = {
                session: App.Data.Frontend.QueueSessionData;
                current: App.Data.Frontend.QueueEntryData | null;
                counters: App.Data.Frontend.QueueCounterData[];
                waiting: App.Data.Frontend.QueueEntryData[];
                stats: App.Data.Frontend.QueueStatsData;
                callable?: App.Data.Frontend.QueueEntryData[];
                history?: App.Data.Frontend.QueueHistoryEntryData[];
            };
            export type QueueStatsData = {
                total: number;
                waiting: number;
                completed: number;
                skipped: number;
                forfeited: number;
            };
        }
    }
    namespace Enums {
        export type DeviceRole =
            | 'DISPLAY'
            | 'QUEUE_TERMINAL'
            | 'OPERATOR_TERMINAL';
        export type DeviceStatus = 'UNREGISTERED' | 'REGISTERED' | 'REVOKED';
        export type QueueSessionStatus = 'RUNNING' | 'ENDED';
        export type QueueStatus =
            | 'WAITING'
            | 'CALLED'
            | 'SERVING'
            | 'COMPLETED'
            | 'SKIPPED'
            | 'FORFEITED';
        export type UserRole = 'ADMINISTRATOR' | 'OPERATOR';
    }
}
declare namespace Illuminate {
    export type CursorPaginator<TKey, TValue> = {
        data: TKey extends string ? Record<TKey, TValue> : TValue[];
        links: {
            url: string | null;
            label: string;
            active: boolean;
        }[];
        meta: {
            path: string;
            per_page: number;
            next_cursor: string | null;
            next_page_url: string | null;
            prev_cursor: string | null;
            prev_page_url: string | null;
        };
    };
    export type CursorPaginatorInterface<TKey, TValue> =
        Illuminate.CursorPaginator<TKey, TValue>;
    export type LengthAwarePaginator<TKey, TValue> = {
        data: TKey extends string ? Record<TKey, TValue> : TValue[];
        links: {
            url: string | null;
            label: string;
            active: boolean;
        }[];
        meta: {
            total: number;
            current_page: number;
            first_page_url: string;
            from: number | null;
            last_page: number;
            last_page_url: string;
            next_page_url: string | null;
            path: string;
            per_page: number;
            prev_page_url: string | null;
            to: number | null;
        };
    };
    export type LengthAwarePaginatorInterface<TKey, TValue> =
        Illuminate.LengthAwarePaginator<TKey, TValue>;
}
declare namespace Spatie {
    namespace LaravelData {
        export type CursorPaginatedDataCollection<TKey, TValue> =
            Illuminate.CursorPaginator<TKey, TValue>;
        export type PaginatedDataCollection<TKey, TValue> =
            Illuminate.LengthAwarePaginator<TKey, TValue>;
    }
}
