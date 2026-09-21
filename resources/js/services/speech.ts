import type { QueueEntry } from '@/types/queue';

const femaleVoicePattern =
    /female|woman|perempuan|gadis|google bahasa indonesia/i;

function preferredVoice(): SpeechSynthesisVoice | undefined {
    const voices = window.speechSynthesis.getVoices();

    return (
        voices.find(
            (voice) =>
                voice.lang.toLowerCase().startsWith('id') &&
                femaleVoicePattern.test(voice.name),
        ) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('id'))
    );
}

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
    utterance.pitch = 1.1;

    const voice = preferredVoice();
    if (voice) {
        utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
}
