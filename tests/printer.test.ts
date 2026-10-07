import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    androidPrinterApps,
    buildAndroidPrintIntent,
    getAndroidPrintInstallUrl,
    loadPrinterSettings,
    printPrinterTest,
    printQueueTicket,
    savePrinterSettings,
} from '../resources/js/services/printer';

void test('iframe printer selection survives saving and reloading settings', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(
        globalThis,
        'window',
    );
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
            localStorage: {
                getItem: (key: string) => storage.get(key) ?? null,
                setItem: (key: string, value: string) =>
                    storage.set(key, value),
            },
        },
    });

    try {
        assert.equal(loadPrinterSettings().mode, null);
        const settings = { ...loadPrinterSettings(), mode: 'iframe' as const };
        savePrinterSettings(settings);

        assert.deepEqual(loadPrinterSettings(), settings);

        for (const app of androidPrinterApps) {
            savePrinterSettings({ ...settings, androidApp: app.id });
            assert.equal(loadPrinterSettings().androidApp, app.id);
        }

        storage.set(
            'antre.queue-terminal.printer',
            JSON.stringify({ mode: 'iframe' }),
        );
        assert.equal(loadPrinterSettings().androidApp, 'rawbt');
        storage.set(
            'antre.queue-terminal.printer',
            JSON.stringify({ mode: 'iframe', androidApp: 'unsupported-app' }),
        );
        assert.equal(loadPrinterSettings().androidApp, null);
    } finally {
        if (originalWindow) {
            Object.defineProperty(globalThis, 'window', originalWindow);
        } else {
            Reflect.deleteProperty(globalThis, 'window');
        }
    }
});

void test('selected USB app receives the ticket and test photo without changing printer apps', async () => {
    const originals = ['window', 'navigator'].map(
        (key) =>
            [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
    );
    const storage = new Map<string, string>();
    const dispatched: string[] = [];
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { userAgent: 'Android', platform: 'Linux' },
    });
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
            localStorage: {
                getItem: (key: string) => storage.get(key) ?? null,
                setItem: (key: string, value: string) =>
                    storage.set(key, value),
            },
            location: {
                href: 'https://antre.test/queue-terminal/settings',
                assign: (uri: string) => dispatched.push(uri),
            },
        },
    });

    try {
        savePrinterSettings({
            ...loadPrinterSettings(),
            mode: 'android-intent',
            androidApp: 'looped-usb',
            paperWidth: 80,
        });
        const printing = printQueueTicket(
            'A001',
            null,
            'Antre & Café',
            'Sesi',
            'data:image/png;base64,AA==',
        );
        assert.equal(dispatched.length, 1);
        await printing;
        let source = new URL(
            dispatched[0].split('#Intent;')[0],
        ).searchParams.get('src')!;
        let markup = decodeURIComponent(
            source.slice(source.indexOf(',') + 1, -1),
        );
        assert.ok(markup.includes('Antre &amp; Café'));
        assert.ok(markup.includes('A001'));
        assert.ok(markup.includes('size:80mm'));
        assert.ok(markup.includes('data:image/png;base64,AA=='));
        assert.ok(
            dispatched[0].includes('package=com.loopedlabs.usbprintservice;'),
        );

        await printPrinterTest(
            'Antre',
            'Sesi',
            'grayscale',
            '2026-10-07T00:00:00Z',
        );
        source = new URL(dispatched[1].split('#Intent;')[0]).searchParams.get(
            'src',
        )!;
        markup = decodeURIComponent(source.slice(source.indexOf(',') + 1, -1));
        assert.ok(
            markup.includes('https://antre.test/images/printer-test-photo.jpg'),
        );
        assert.ok(markup.includes('filter:grayscale(1)'));

        savePrinterSettings({ ...loadPrinterSettings(), androidApp: null });
        await assert.rejects(
            printQueueTicket('A001', null, 'Antre', 'Sesi'),
            /Pilih aplikasi cetak/,
        );
        assert.equal(dispatched.length, 2);

        savePrinterSettings({
            ...loadPrinterSettings(),
            androidApp: 'quick-printer',
        });
        const quickPrint = printQueueTicket(
            'A001',
            null,
            'Antre & Café <DRAWER>\n',
            'Sesi',
        );
        assert.equal(dispatched.length, 3);
        await quickPrint;
        const commands = decodeURIComponent(
            dispatched[2].split('#Intent;')[0].slice('intent://'.length),
        );
        assert.ok(commands.includes('<PRINTER avoid_dialog>'));
        assert.ok(commands.includes('Antre & Café  DRAWER  '));
        assert.ok(!commands.includes('<DRAWER>'));
        assert.ok(commands.includes('<BIG><BOLD>A001<BR>'));
        assert.ok(
            dispatched[2].includes(
                'scheme=quickprinter;package=pe.diegoveloper.printerserverapp;',
            ),
        );
        await printPrinterTest('Antre', 'Sesi', 'grayscale');
        assert.ok(
            decodeURIComponent(dispatched[3]).includes(
                '<IMAGE>https://antre.test/images/printer-test-photo.jpg<BR>',
            ),
        );
        await assert.rejects(
            printQueueTicket(
                'A001',
                null,
                'Antre',
                'Sesi',
                'data:image/png;base64,AA==',
            ),
            /foto kamera/,
        );
        assert.equal(dispatched.length, 4);
    } finally {
        for (const [key, original] of originals) {
            if (original) {
                Object.defineProperty(globalThis, key, original);
            } else {
                Reflect.deleteProperty(globalThis, key);
            }
        }
    }
});

void test('RawBT intent keeps binary data and provides its own installation fallback', () => {
    const payload = 'G0BB+/==';
    assert.equal(
        buildAndroidPrintIntent('rawbt', payload),
        `intent:base64,${payload}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dru.a402d.rawbtprinter;end`,
    );
});

void test('Quick Printer encodes commands without allowing intent delimiter injection', () => {
    const payload = '<CENTER>Café #Intent;scheme=bad;&? +/%<BR><CUT>';
    const [uri, extras] = buildAndroidPrintIntent(
        'quick-printer',
        payload,
    ).split('#Intent;');
    assert.equal(decodeURIComponent(uri.slice('intent://'.length)), payload);
    assert.equal(
        extras,
        `scheme=quickprinter;package=pe.diegoveloper.printerserverapp;S.browser_fallback_url=${encodeURIComponent(getAndroidPrintInstallUrl('quick-printer'))};end`,
    );
});

void test('Looped Labs intents preserve HTML and target the selected connection app', () => {
    const markup =
        '<html><body>Antre & café #1; "uji" <img src="data:image/png;base64,AA+/=" /></body></html>';
    const profiles = [
        ['looped-usb', 'usb', 'com.loopedlabs.usbprintservice'],
        ['looped-bluetooth', 'bt', 'com.loopedlabs.escposprintservice'],
        ['looped-wifi', 'net', 'com.loopedlabs.netprintservice'],
    ] as const;

    for (const [app, transport, packageName] of profiles) {
        const intent = buildAndroidPrintIntent(app, markup);
        const [uri, extras] = intent.split('#Intent;');
        const url = new URL(uri);
        assert.equal(url.host, 'escpos.org');
        assert.equal(url.pathname, `/escpos/${transport}/print`);
        assert.equal(url.searchParams.get('srcTp'), 'uri');
        assert.equal(url.searchParams.get('srcObj'), 'html');
        const source = url.searchParams.get('src')!;
        assert.ok(source.startsWith("'data:text/html;charset=utf-8,"));
        assert.ok(source.endsWith("'"));
        assert.equal(
            decodeURIComponent(source.slice(source.indexOf(',') + 1, -1)),
            markup,
        );
        assert.ok(extras.includes(`scheme=print;package=${packageName};`));
        assert.ok(
            extras.includes(
                `S.browser_fallback_url=${encodeURIComponent(getAndroidPrintInstallUrl(app))};end`,
            ),
        );
        assert.equal(
            getAndroidPrintInstallUrl(app),
            `https://play.google.com/store/apps/details?id=${packageName}`,
        );
    }
});
