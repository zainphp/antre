export type DeviceRole = 'DISPLAY' | 'QUEUE_TERMINAL' | 'OPERATOR_TERMINAL';

export type DeviceStatus = 'UNREGISTERED' | 'REGISTERED' | 'REVOKED';

export type Device = {
    id: string;
    label: string;
    name: string;
    role: DeviceRole | null;
    role_label: string | null;
    status: DeviceStatus;
    registered_at: string | null;
    last_seen_at: string | null;
    revoked_at: string | null;
};
