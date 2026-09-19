export type DeviceRole = 'DISPLAY' | 'QUEUE_TERMINAL' | 'OPERATOR_TERMINAL';

export type DeviceStatus = 'UNREGISTERED' | 'REGISTERED' | 'REVOKED';

export type Device = {
    id: string;
    label: string;
    name: string;
    roles: DeviceRole[];
    role_labels: string[];
    status: DeviceStatus;
    registered_at: string | null;
    last_seen_at: string | null;
    revoked_at: string | null;
};
