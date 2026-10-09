type QueueEntry = App.Data.Frontend.QueueEntryData;

const digitClips = [
    'nol',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
];

let audio: HTMLAudioElement | null = null;
let cancelClip: (() => void) | null = null;
let cancelSpeech: (() => void) | null = null;
let playbackVersion = 0;

export function stopAnnouncement(): void {
    playbackVersion++;
    cancelClip?.();
    if (cancelSpeech) {
        cancelSpeech();
        speechSynthesis.cancel();
    }
    audio?.pause();
}

async function playClips(clips: string[]): Promise<void> {
    stopAnnouncement();
    audio ??= new Audio();
    const player = audio;
    const version = playbackVersion;

    for (const clip of clips) {
        if (version !== playbackVersion) {
            return;
        }
        const completed = await new Promise<boolean>((resolve, reject) => {
            let settled = false;
            const finish = (error?: Error, cancelled = false) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeout);
                player.onended = null;
                player.onerror = null;
                cancelClip = null;
                if (error) {
                    player.pause();
                    reject(error);
                } else {
                    resolve(!cancelled);
                }
            };
            const timeout = setTimeout(
                () => finish(new Error('Audio tidak selesai diputar.')),
                20000,
            );
            cancelClip = () => finish(undefined, true);
            player.onended = () => finish();
            player.onerror = () => finish(new Error('Audio gagal dimuat.'));
            player.src = `/audio/announcements/id/${clip}.wav`;
            player.play().catch((error: Error) => finish(error));
        });

        if (!completed) {
            return;
        }
    }
}

export function announceQueue(entry: QueueEntry | null): Promise<void> {
    if (!entry) {
        stopAnnouncement();

        return Promise.resolve();
    }

    const counter = /^Loket ([1-9]|1\d|20)$/.exec(entry.counter ?? '');
    if (!/^[A-Z0-9]+$/i.test(entry.number) || (entry.counter && !counter)) {
        stopAnnouncement();

        return Promise.reject(
            new Error('Nomor atau loket tidak didukung audio.'),
        );
    }

    if (/[A-Z]/i.test(entry.number)) {
        stopAnnouncement();
        if (
            typeof speechSynthesis === 'undefined' ||
            typeof SpeechSynthesisUtterance === 'undefined'
        ) {
            return Promise.reject(
                new Error(
                    'Panggilan berawalan huruf memerlukan dukungan suara browser.',
                ),
            );
        }

        return new Promise<void>((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(
                `Nomor antrian ${entry.number}, silakan menuju ${entry.counter ?? 'loket layanan'}.`,
            );
            utterance.lang = 'id-ID';
            utterance.rate = 0.9;
            utterance.voice =
                speechSynthesis
                    .getVoices()
                    .find((voice) =>
                        voice.lang.toLowerCase().startsWith('id'),
                    ) ?? null;
            const finish = (error?: Error) => {
                utterance.onend = null;
                utterance.onerror = null;
                cancelSpeech = null;
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            };
            cancelSpeech = () => finish();
            utterance.onend = () => finish();
            utterance.onerror = (event) => finish(new Error(event.error));
            try {
                speechSynthesis.speak(utterance);
            } catch (error) {
                finish(
                    error instanceof Error ? error : new Error(String(error)),
                );
            }
        });
    }

    return playClips([
        'nomor',
        'antrian',
        ...entry.number.split('').map((digit) => digitClips[Number(digit)]),
        'silahkan',
        'menuju',
        'loket',
        ...(counter
            ? counter[1].split('').map((digit) => digitClips[Number(digit)])
            : []),
    ]);
}
