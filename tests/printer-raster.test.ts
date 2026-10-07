import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    monochromeTicket,
    renderUsbTicket,
    wrapTicketText,
} from '../resources/js/services/printer-raster';
import { packEscPosRaster } from '../resources/js/services/printer-ticket';
import {
    loadPrinterSettings,
    savePrinterSettings,
    printPrinterTest,
} from '../resources/js/services/printer';
import {
    connectUsbPrinter,
    disconnectUsbPrinter,
} from '../resources/js/services/printer-usb';

void test('ticket wrapping preserves Unicode and fits long labels', () => {
    const context = {
        measureText: (value: string) => ({ width: Array.from(value).length }),
    };
    assert.deepEqual(
        wrapTicketText(context, 'Antre Café', 7).map((line) => line.trim()),
        ['Antre', 'Café'],
    );
    const lines = wrapTicketText(context, 'ABCDEFGHIJKLMN', 5);
    assert.deepEqual(lines, ['ABCDE', 'FGHIJ', 'KLMN']);
    assert.deepEqual(wrapTicketText(context, '日本語\nSesi', 5), [
        '日本語',
        'Sesi',
    ]);
});

void test('monochrome preview and ESC/POS bitmap encode the same pixels including transparency', () => {
    const rgba = new Uint8ClampedArray([
        0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0,
    ]);
    const mono = monochromeTicket(rgba, 3, 1, 'black-and-white');
    assert.deepEqual(mono.raster, new Uint8Array([128]));
    assert.deepEqual(
        mono.pixels,
        new Uint8ClampedArray([
            0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255,
        ]),
    );
    assert.deepEqual(
        packEscPosRaster(mono.raster, 3, 1),
        new Uint8Array([29, 118, 48, 0, 1, 0, 1, 0, 128]),
    );
    assert.throws(() => packEscPosRaster(new Uint8Array(), 8, 1), /Ukuran/);
    const gray = new Uint8ClampedArray(16 * 4);
    for (let i = 0; i < 16; i++) {
        gray.set([127, 127, 127, 255], i * 4);
    }
    const dithered = monochromeTicket(gray, 8, 2, 'grayscale');
    assert.ok(dithered.raster.some((value) => value !== 255 && value !== 0));
    assert.deepEqual(monochromeTicket(gray, 8, 2, 'full-color'), dithered);
    for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 8; x++) {
            const black = Boolean(dithered.raster[y] & (128 >> x));
            assert.equal(dithered.pixels[(y * 8 + x) * 4], black ? 0 : 255);
        }
    }
});

void test('USB renderer sizes content, includes photos, and emits the same raster shown in its preview', async () => {
    const originals = ['document', 'Image', 'window', 'navigator'].map(
        (key) =>
            [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
    );
    let imageFails = false;
    let photos = 0;
    const text: string[] = [];
    const canvases: { width: number; height: number }[] = [];
    Object.defineProperty(globalThis, 'Image', {
        configurable: true,
        value: class {
            naturalWidth = 100;
            naturalHeight = 200;
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            set src(_value: string) {
                if (imageFails) {
                    this.onerror?.();
                } else {
                    this.onload?.();
                }
            }
        },
    });
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
            fonts: { ready: Promise.resolve() },
            createElement: () => {
                const canvas = {
                    width: 0,
                    height: 0,
                    toDataURL: () => 'data:image/png;base64,PREVIEW',
                    getContext: () => context,
                };
                const context = {
                    font: '',
                    fillStyle: '',
                    textAlign: '',
                    textBaseline: '',
                    filter: '',
                    measureText: (value: string) => ({
                        width: Array.from(value).length * 10,
                    }),
                    fillRect: () => {},
                    scale: () => {},
                    fillText: (value: string) => {
                        text.push(value.trim());
                    },
                    save: () => {},
                    restore: () => {},
                    beginPath: () => {},
                    roundRect: () => {},
                    clip: () => {},
                    drawImage: () => {
                        photos++;
                    },
                    getImageData: () => ({
                        data: new Uint8ClampedArray(
                            canvas.width * canvas.height * 4,
                        ).fill(255),
                    }),
                    putImageData: (value: { data: Uint8ClampedArray }) => {
                        assert.ok(value.data.every((byte) => byte === 255));
                    },
                };
                canvases.push(canvas);
                return canvas;
            },
        },
    });
    try {
        const first = await renderUsbTicket(
            'A001',
            null,
            'Antre',
            'Sesi',
            null,
            58,
            'black-and-white',
        );
        assert.equal(first.preview, 'data:image/png;base64,PREVIEW');
        assert.ok(text.includes('A001'));
        assert.equal(canvases[0].width, 384);
        assert.deepEqual(
            first.bytes.slice(0, 13),
            new Uint8Array([
                27,
                64,
                27,
                97,
                1,
                29,
                118,
                48,
                0,
                48,
                0,
                canvases[0].height & 255,
                canvases[0].height >> 8,
            ]),
        );
        assert.equal(first.bytes.length, 13 + 48 * canvases[0].height);
        await renderUsbTicket(
            'B002',
            null,
            'Antre',
            'Sesi',
            'data:image/png;base64,AA==',
            58,
            'grayscale',
        );
        assert.ok(canvases[1].height > canvases[0].height);
        assert.equal(photos, 1);
        await renderUsbTicket(
            'C003',
            null,
            'Antre '.repeat(30),
            'Sesi',
            null,
            80,
            'black-and-white',
        );
        assert.equal(canvases[2].width, 576);
        assert.ok(canvases[2].height > canvases[0].height);
        imageFails = true;
        await assert.rejects(
            renderUsbTicket(
                'A001',
                null,
                'Antre',
                'Sesi',
                '/missing.jpg',
                58,
                'grayscale',
            ),
            /Foto belum/,
        );
        imageFails = false;
        const storage = new Map<string, string>();
        const sent: Uint8Array[] = [];
        const alternate = {
            alternateSetting: 0,
            interfaceClass: 7,
            endpoints: [{ direction: 'out', type: 'bulk', endpointNumber: 2 }],
        };
        const configuration = {
            configurationValue: 1,
            interfaces: [
                { interfaceNumber: 0, alternates: [alternate], alternate },
            ],
        };
        const device = {
            vendorId: 11,
            productId: 22,
            opened: true,
            configurations: [configuration],
            configuration,
            open: async () => {},
            close: async () => {},
            selectConfiguration: async () => {},
            claimInterface: async () => {},
            releaseInterface: async () => {},
            selectAlternateInterface: async () => {},
            transferOut: async (_endpoint: number, bytes: Uint8Array) => {
                sent.push(bytes);
                return { status: 'ok', bytesWritten: bytes.length };
            },
        };
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: {
                isSecureContext: true,
                localStorage: {
                    getItem: (key: string) => storage.get(key) ?? null,
                    setItem: (key: string, value: string) =>
                        storage.set(key, value),
                },
            },
        });
        Object.defineProperty(globalThis, 'navigator', {
            configurable: true,
            value: {
                usb: {
                    requestDevice: async () => device,
                    getDevices: async () => [device],
                    addEventListener: () => {},
                },
            },
        });
        const saved = await connectUsbPrinter();
        savePrinterSettings({
            ...loadPrinterSettings(),
            mode: 'web-usb',
            usbDevice: saved,
            paperWidth: 58,
            usbAutoCut: true,
        });
        await printPrinterTest(
            'Antre',
            'Sesi',
            'grayscale',
            '2026-10-08T00:00:00Z',
        );
        const expected = await renderUsbTicket(
            'UJI',
            '2026-10-08T00:00:00Z',
            'Antre',
            'Sesi',
            '/images/printer-test-photo.jpg',
            58,
            'grayscale',
        );
        const allBytes = new Uint8Array(
            sent.flatMap((chunk) => Array.from(chunk)),
        );
        assert.deepEqual(allBytes.slice(0, -4), expected.bytes);
        assert.deepEqual(allBytes.slice(-4), new Uint8Array([29, 86, 65, 0]));
    } finally {
        await disconnectUsbPrinter();
        for (const [key, original] of originals) {
            if (original) {
                Object.defineProperty(globalThis, key, original);
            } else {
                Reflect.deleteProperty(globalThis, key);
            }
        }
    }
});
