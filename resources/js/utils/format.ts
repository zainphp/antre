export function formatTime(value: string | null): string {
    return value
        ? new Intl.DateTimeFormat('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
          }).format(new Date(value))
        : '—';
}

export function formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);

    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(
        new Date(year, month - 1, day),
    );
}

export function formatDateTime(value: string | null): string {
    return value
        ? new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(new Date(value))
        : '—';
}
