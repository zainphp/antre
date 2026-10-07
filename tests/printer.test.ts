import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    loadPrinterSettings,
    savePrinterSettings,
} from '../resources/js/services/printer';

test('iframe printer selection survives saving and reloading settings', () => {
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
    } finally {
        if (originalWindow) {
            Object.defineProperty(globalThis, 'window', originalWindow);
        } else {
            Reflect.deleteProperty(globalThis, 'window');
        }
    }
});
