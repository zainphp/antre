type QueueEntry = App.Data.Frontend.QueueEntryData;

const femaleVoicePattern =
    /female|woman|perempuan|gadis|google bahasa indonesia/i;
const voiceLoadTimeout = 1000;

let pendingVoiceRequest: {
    speech: SpeechSynthesis;
    listener: () => void;
    timeoutId: number;
} | null = null;

function preferredVoice(
    voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
    return (
        voices.find(
            (voice) =>
                voice.lang.toLowerCase().startsWith('id') &&
                femaleVoicePattern.test(voice.name),
        ) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('id'))
    );
}

function hasFemaleIndonesianVoice(voices: SpeechSynthesisVoice[]): boolean {
    return voices.some(
        (voice) =>
            voice.lang.toLowerCase().startsWith('id') &&
            femaleVoicePattern.test(voice.name),
    );
}

function cancelPendingVoiceRequest(): void {
    if (!pendingVoiceRequest) {
        return;
    }

    pendingVoiceRequest.speech.removeEventListener(
        'voiceschanged',
        pendingVoiceRequest.listener,
    );
    window.clearTimeout(pendingVoiceRequest.timeoutId);
    pendingVoiceRequest = null;
}

function speakEntry(entry: QueueEntry, speech: SpeechSynthesis): void {
    const utterance = new SpeechSynthesisUtterance(
        `Nomor antrian ${entry.number}, silakan menuju ${entry.counter ?? 'loket layanan'}.`,
    );
    utterance.lang = 'id-ID';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;

    const voice = preferredVoice(speech.getVoices());
    if (voice) {
        utterance.voice = voice;
    }

    speech.speak(utterance);
}

function speakWhenVoicesReady(
    entry: QueueEntry,
    speech: SpeechSynthesis,
): void {
    const speak = () => {
        cancelPendingVoiceRequest();
        speakEntry(entry, speech);
    };
    const listener = () => {
        if (hasFemaleIndonesianVoice(speech.getVoices())) {
            speak();
        }
    };
    const timeoutId = window.setTimeout(speak, voiceLoadTimeout);

    pendingVoiceRequest = { speech, listener, timeoutId };
    speech.addEventListener('voiceschanged', listener);
}

export function announceQueue(entry: QueueEntry | null): void {
    if (!('speechSynthesis' in window)) {
        return;
    }

    const speech = window.speechSynthesis;
    speech.cancel();
    cancelPendingVoiceRequest();

    if (!entry) {
        return;
    }

    const voices = speech.getVoices();
    if (hasFemaleIndonesianVoice(voices)) {
        speakEntry(entry, speech);

        return;
    }

    speakWhenVoicesReady(entry, speech);
}
