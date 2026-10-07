import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    connectUsbPrinter,
    disconnectUsbPrinter,
    findUsbPrinterEndpoint,
    getUsbPrinterState,
    matchesUsbPrinter,
    printUsbTicket,
    subscribeUsbPrinter,
    supportsWebUsb,
} from '../resources/js/services/printer-usb';
import {
    loadPrinterSettings,
    savePrinterSettings,
} from '../resources/js/services/printer';

const configuration = (interfaceClass = 7, endpoint = 3) => ({
    configurationValue: 2,
    interfaces: [
        {
            interfaceNumber: 4,
            alternate: {
                alternateSetting: 0,
                interfaceClass,
                endpoints: [
                    {
                        direction: 'out',
                        type: 'bulk',
                        endpointNumber: endpoint,
                    },
                ],
            },
            alternates: [
                {
                    alternateSetting: 0,
                    interfaceClass,
                    endpoints: [
                        {
                            direction: 'out',
                            type: 'bulk',
                            endpointNumber: endpoint,
                        },
                    ],
                },
            ],
        },
    ],
});

void test('USB discovery prefers a unique printer endpoint and matches saved identity safely', () => {
    assert.deepEqual(
        findUsbPrinterEndpoint([configuration(255, 9), configuration()]),
        { configuration: 2, interfaceNumber: 4, alternate: 0, endpoint: 3 },
    );
    assert.equal(findUsbPrinterEndpoint([configuration(255, 9)]).endpoint, 9);
    assert.throws(
        () => findUsbPrinterEndpoint([configuration(), configuration()]),
        /secara aman/,
    );
    assert.throws(
        () => findUsbPrinterEndpoint([configuration(3)]),
        /tidak menyediakan/,
    );
    assert.throws(() => findUsbPrinterEndpoint([]), /tidak menyediakan/);
    const saved = {
        vendorId: 11,
        productId: 22,
        serialNumber: 'ABC',
        name: 'USB',
    };
    assert.ok(matchesUsbPrinter(saved, saved));
    assert.ok(!matchesUsbPrinter({ ...saved, serialNumber: 'OTHER' }, saved));
    assert.ok(!matchesUsbPrinter({ ...saved, productId: 23 }, saved));
    assert.ok(
        matchesUsbPrinter(
            { ...saved, serialNumber: undefined },
            { ...saved, serialNumber: null },
        ),
    );
});

void test('USB connection, persistence, transfer checks, cancellation and cleanup', async () => {
    const originals = ['navigator', 'window'].map(
        (key) =>
            [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
    );
    const storage = new Map<string, string>();
    const calls: string[] = [];
    const sent: Uint8Array[] = [];
    let devices: (typeof device)[] = [];
    let cancel = false;
    let failClaim = false;
    let short = false;
    let status = 'ok';
    let disconnect: ((event: { device: typeof device }) => void) | undefined;
    const device = {
        vendorId: 11,
        productId: 22,
        serialNumber: 'ABC',
        productName: 'C58AC',
        opened: false,
        configurations: [configuration()],
        configuration: null as ReturnType<typeof configuration> | null,
        open: async () => {
            device.opened = true;
            calls.push('open');
        },
        close: async () => {
            device.opened = false;
            calls.push('close');
        },
        selectConfiguration: async (value: number) => {
            assert.equal(value, 2);
            device.configuration = configuration();
            calls.push('configuration');
        },
        claimInterface: async (value: number) => {
            assert.equal(value, 4);
            calls.push('claim');
            if (failClaim) {
                throw new DOMException('Denied', 'SecurityError');
            }
        },
        releaseInterface: async () => {
            calls.push('release');
        },
        selectAlternateInterface: async () => {
            calls.push('alternate');
        },
        transferOut: async (endpoint: number, bytes: Uint8Array) => {
            assert.equal(endpoint, 3);
            sent.push(bytes);
            return {
                status,
                bytesWritten: short ? bytes.length - 1 : bytes.length,
            };
        },
    };
    const usb = {
        requestDevice: async (options: unknown) => {
            calls.push('chooser');
            assert.deepEqual(options, {
                filters: [{ classCode: 7 }, { classCode: 255 }],
            });
            if (cancel) {
                throw new DOMException('Cancelled', 'NotFoundError');
            }
            return device;
        },
        getDevices: async () => devices,
        addEventListener: (_event: string, listener: typeof disconnect) => {
            disconnect = listener;
        },
    };
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { usb },
    });
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
    const states: string[] = [];
    const unsubscribe = subscribeUsbPrinter((state) => states.push(state));
    try {
        assert.ok(supportsWebUsb());
        window.isSecureContext = false;
        assert.ok(!supportsWebUsb());
        await assert.rejects(connectUsbPrinter(), /HTTPS/);
        window.isSecureContext = true;
        const defaults = loadPrinterSettings();
        assert.equal(defaults.usbDevice, null);
        assert.equal(defaults.usbAutoCut, true);
        const saved = await connectUsbPrinter();
        assert.equal(getUsbPrinterState(), 'CONNECTED');
        assert.deepEqual(calls, ['chooser', 'open', 'configuration', 'claim']);
        savePrinterSettings({
            ...defaults,
            mode: 'web-usb',
            usbDevice: saved,
            usbAutoCut: false,
        });
        assert.deepEqual(loadPrinterSettings().usbDevice, saved);
        assert.equal(loadPrinterSettings().mode, 'web-usb');
        assert.equal(loadPrinterSettings().usbAutoCut, false);
        assert.deepEqual(await connectUsbPrinter(saved), saved);
        assert.equal(calls.filter((call) => call === 'chooser').length, 1);
        const payload = new Uint8Array(20000).fill(73);
        await printUsbTicket(saved, async () => payload, true);
        assert.deepEqual(
            sent.map((chunk) => chunk.length),
            [16384, 3620],
        );
        assert.deepEqual(sent[1].slice(-4), new Uint8Array([29, 86, 65, 0]));
        assert.deepEqual(sent[0], payload.slice(0, 16384));
        sent.length = 0;
        await printUsbTicket(saved, async () => new Uint8Array([1, 2]), false);
        assert.deepEqual(sent, [new Uint8Array([1, 2, 0x1b, 0x64, 4])]);

        let finish!: (bytes: Uint8Array) => void;
        const building = printUsbTicket(
            saved,
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
            false,
        );
        await assert.rejects(
            printUsbTicket(saved, async () => payload, false),
            /sedang digunakan/,
        );
        await assert.rejects(connectUsbPrinter(saved), /sedang digunakan/);
        finish(new Uint8Array([3]));
        await building;
        short = true;
        sent.length = 0;
        await assert.rejects(
            printUsbTicket(saved, async () => payload, true),
            /tercetak sebagian/,
        );
        assert.equal(sent.length, 1);
        assert.equal(getUsbPrinterState(), 'FAILED');
        assert.ok(calls.includes('release'));
        assert.ok(!device.opened);
        await assert.rejects(
            printUsbTicket(saved, async () => payload, false),
            /Hubungkan ulang/,
        );
        short = false;
        devices = [device, { ...device }];
        await assert.rejects(connectUsbPrinter(saved), /beberapa printer/);
        devices = [];
        await assert.rejects(connectUsbPrinter(saved), /tidak ditemukan/);
        devices = [device];
        await connectUsbPrinter(saved);
        status = 'stall';
        await assert.rejects(
            printUsbTicket(saved, async () => payload, false),
            /tidak terkirim lengkap/,
        );
        status = 'ok';
        await connectUsbPrinter(saved);
        disconnect?.({ device });
        assert.equal(getUsbPrinterState(), 'DISCONNECTED');
        await disconnectUsbPrinter();
        cancel = true;
        await assert.rejects(connectUsbPrinter(), /dibatalkan/);
        cancel = false;
        failClaim = true;
        await assert.rejects(connectUsbPrinter(), /Izinkan akses USB/);
        assert.ok(!device.opened);
        failClaim = false;
        storage.set(
            'antre.queue-terminal.printer',
            JSON.stringify({
                mode: 'web-usb',
                usbDevice: { ...saved, vendorId: -1 },
            }),
        );
        assert.equal(loadPrinterSettings().usbDevice, null);
        assert.ok(states.includes('CONNECTED'));
        assert.ok(states.includes('FAILED'));
    } finally {
        unsubscribe();
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
