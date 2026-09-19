import type { QueueEntry } from '@/types/queue';

export function announceQueue(entry: QueueEntry | null): void {
    if (!entry || !('speechSynthesis' in window)) {
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
        `Nomor antrian ${entry.number}, silakan menuju ${entry.counter ?? 'loket layanan'}.`,
    );
    utterance.lang = 'id-ID';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}
