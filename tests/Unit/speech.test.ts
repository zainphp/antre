import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { existsSync } from 'node:fs';
import {
    announceQueue,
    stopAnnouncement,
} from '../../resources/js/services/speech';

class FakeAudio {
    static instance: FakeAudio;
    src = '';
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    played: string[] = [];
    failure: Error | null = null;
    paused = false;

    constructor() {
        FakeAudio.instance = this;
    }

    play(): Promise<void> {
        this.paused = false;
        this.played.push(this.src);
        return this.failure ? Promise.reject(this.failure) : Promise.resolve();
    }

    pause(): void {
        this.paused = true;
    }
}

Object.defineProperty(globalThis, 'Audio', {
    value: FakeAudio,
    configurable: true,
});

function entry(number: string, counter: string | null = 'Loket 1') {
    return { number, counter } as App.Data.Frontend.QueueEntryData;
}

async function endClip() {
    FakeAudio.instance.onended?.();
    await Promise.resolve();
}

beforeEach(async () => {
    const activation = announceQueue(entry('001'));
    stopAnnouncement();
    await activation;
    FakeAudio.instance.played = [];
});

afterEach(() => {
    stopAnnouncement();
    FakeAudio.instance.played = [];
    FakeAudio.instance.failure = null;
});

void test('plays all digits, leading zeroes and counter 20 sequentially using captured assets', async () => {
    const playback = announceQueue(entry('0123456789', 'Loket 20'));
    const player = FakeAudio.instance;
    assert.equal(player.played.length, 1);
    const expected = [
        'nomor',
        'antrian',
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
        'silahkan',
        'menuju',
        'loket',
        'dua',
        'nol',
    ];
    for (const clip of expected) {
        assert.equal(player.src, `/audio/announcements/id/${clip}.wav`);
        assert.ok(existsSync(`public${player.src}`));
        await endClip();
    }
    await playback;
    assert.equal(player.played.length, expected.length);
});

void test('calls start automatically with the nomor prompt and reuse the audio element', async () => {
    const first = announceQueue(entry('001'));
    const player = FakeAudio.instance;
    assert.equal(player.src, '/audio/announcements/id/nomor.wav');
    const second = announceQueue(entry('002'));
    await first;
    assert.equal(FakeAudio.instance, player);
    stopAnnouncement();
    await second;
});

void test('a newer call interrupts the old sequence', async () => {
    const first = announceQueue(entry('001'));
    const second = announceQueue(entry('002'));
    await first;
    await endClip();
    assert.equal(FakeAudio.instance.src, '/audio/announcements/id/antrian.wav');
    stopAnnouncement();
    await second;
    assert.equal(FakeAudio.instance.onended, null);
});

void test('a new call prevents a just-ended old clip from advancing', async () => {
    const first = announceQueue(entry('001'));
    FakeAudio.instance.onended?.();
    const second = announceQueue(entry('002'));
    await first;
    assert.equal(FakeAudio.instance.src, '/audio/announcements/id/nomor.wav');
    stopAnnouncement();
    await second;
});

void test('clearing the queue stops playback', async () => {
    const playback = announceQueue(entry('001'));
    await announceQueue(null);
    await playback;
    assert.ok(FakeAudio.instance.paused);
    assert.equal(FakeAudio.instance.onended, null);
});

void test('blocked autoplay rejects without playing the remaining clips', async () => {
    FakeAudio.instance.failure = new Error('NotAllowedError');
    await assert.rejects(announceQueue(entry('001')), /NotAllowedError/);
    assert.equal(FakeAudio.instance.played.length, 1);
    assert.equal(FakeAudio.instance.onended, null);
});

void test('missing audio rejects and stops the sequence', async () => {
    const playback = announceQueue(entry('001'));
    FakeAudio.instance.onerror?.();
    await assert.rejects(playback, /Audio gagal dimuat/);
    assert.ok(FakeAudio.instance.paused);
});

void test('unsupported numbers and counters reject before any audio plays', async () => {
    await assert.rejects(announceQueue(entry('../001')), /tidak didukung/);
    await assert.rejects(
        announceQueue(entry('001', 'Loket 21')),
        /tidak didukung/,
    );
    assert.equal(FakeAudio.instance.played.length, 0);
});

void test('a missing counter plays the generic loket prompt without inventing a number', async () => {
    const playback = announceQueue(entry('1', null));
    const expected = [
        'nomor',
        'antrian',
        'satu',
        'silahkan',
        'menuju',
        'loket',
    ];
    for (const clip of expected) {
        assert.equal(
            FakeAudio.instance.src,
            `/audio/announcements/id/${clip}.wav`,
        );
        await endClip();
    }
    await playback;
    assert.equal(FakeAudio.instance.played.length, expected.length);
});

class FakeUtterance {
    lang = '';
    rate = 1;
    voice = null;
    onend: (() => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    constructor(public text: string) {}
}

void test('letter-prefixed queues retain Indonesian speech and yield to numeric clips', async () => {
    let spoken: FakeUtterance | null = null;
    let cancelled = false;
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
        value: FakeUtterance,
        configurable: true,
    });
    Object.defineProperty(globalThis, 'speechSynthesis', {
        value: {
            getVoices: () => [],
            speak: (utterance: FakeUtterance) => {
                spoken = utterance;
            },
            cancel: () => {
                cancelled = true;
            },
        },
        configurable: true,
    });
    try {
        const fallback = announceQueue(entry('B001', 'Loket 2'));
        assert.ok(spoken);
        assert.equal(
            spoken.text,
            'Nomor antrian B001, silakan menuju Loket 2.',
        );
        assert.equal(spoken.lang, 'id-ID');
        assert.equal(FakeAudio.instance.played.length, 0);
        spoken.onend?.();
        await fallback;
        const pending = announceQueue(entry('A2C3001'));
        const numeric = announceQueue(entry('002'));
        await pending;
        assert.ok(cancelled);
        stopAnnouncement();
        await numeric;
    } finally {
        stopAnnouncement();
        Reflect.deleteProperty(globalThis, 'speechSynthesis');
        Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance');
    }
});

void test('prefixed queues report unavailable speech without omitting the prefix', async () => {
    await assert.rejects(
        announceQueue(entry('B001')),
        /memerlukan dukungan suara browser/,
    );
    assert.equal(FakeAudio.instance.played.length, 0);
});
