import {
    buildEscPosTicket,
    buildTicketMarkup,
    printerTestPhotoUrl,
} from '@/services/printer-ticket';
import type { PaperWidth, PrintImageMode } from '@/services/printer-ticket';

export {
    buildTicketMarkup,
    printerTestPhotoUrl,
} from '@/services/printer-ticket';
export type { PaperWidth, PrintImageMode } from '@/services/printer-ticket';

export type PrinterMode =
    | 'browser'
    | 'browser-default'
    | 'rawbt'
    | 'web-bluetooth';
export type PrinterSettings = {
    mode: PrinterMode;
    paperWidth: PaperWidth;
    bluetoothDeviceId: string | null;
    bluetoothDeviceName: string | null;
};

type BluetoothCharacteristic = {
    properties: {
        write?: boolean;
        writeWithoutResponse?: boolean;
    };
    writeValue?: (value: Uint8Array) => Promise<void>;
    writeValueWithResponse?: (value: Uint8Array) => Promise<void>;
    writeValueWithoutResponse?: (value: Uint8Array) => Promise<void>;
};

type BluetoothService = {
    getCharacteristics: () => Promise<BluetoothCharacteristic[]>;
};

type BluetoothServer = {
    connected: boolean;
    connect: () => Promise<BluetoothServer>;
    getPrimaryServices: () => Promise<BluetoothService[]>;
};

type BluetoothDevice = {
    id: string;
    name?: string;
    gatt?: BluetoothServer | null;
};

type BluetoothApi = {
    requestDevice: (options: {
        acceptAllDevices: boolean;
        optionalServices: string[];
    }) => Promise<BluetoothDevice>;
    getDevices?: () => Promise<BluetoothDevice[]>;
};

const STORAGE_KEY = 'antre.queue-terminal.printer';
const rawBtPackage = 'ru.a402d.rawbtprinter';
const bluetoothServiceUuids = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

let bluetoothConnection: {
    device: BluetoothDevice;
    characteristic: BluetoothCharacteristic;
} | null = null;

export function loadPrinterSettings(): PrinterSettings {
    const defaults: PrinterSettings = {
        mode: 'browser-default',
        paperWidth: 58,
        bluetoothDeviceId: null,
        bluetoothDeviceName: null,
    };

    if (typeof window === 'undefined') {
        return defaults;
    }

    try {
        const stored = JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) ?? '{}',
        ) as Partial<PrinterSettings>;
        const storedMode = stored.mode;
        const mode: PrinterMode =
            storedMode === 'rawbt' ||
            storedMode === 'web-bluetooth' ||
            storedMode === 'browser-default'
                ? storedMode
                : storedMode === 'browser' && import.meta.env.DEV
                  ? 'browser'
                  : 'browser-default';

        return {
            mode,
            paperWidth: stored.paperWidth === 80 ? 80 : 58,
            bluetoothDeviceId:
                typeof stored.bluetoothDeviceId === 'string'
                    ? stored.bluetoothDeviceId
                    : null,
            bluetoothDeviceName:
                typeof stored.bluetoothDeviceName === 'string'
                    ? stored.bluetoothDeviceName
                    : null,
        };
    } catch {
        return defaults;
    }
}

export function savePrinterSettings(settings: PrinterSettings): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function supportsWebBluetooth(): boolean {
    return getBluetoothApi() !== null;
}

export async function pairWebBluetoothPrinter(): Promise<{
    id: string;
    name: string;
}> {
    const bluetooth = getBluetoothApi();
    if (!bluetooth) {
        throw new Error('Browser ini tidak mendukung Web Bluetooth.');
    }

    const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: bluetoothServiceUuids,
    });
    const characteristic = await findWritableCharacteristic(device);

    bluetoothConnection = { device, characteristic };

    return {
        id: device.id,
        name: device.name ?? 'Printer BLE',
    };
}

export async function printQueueTicket(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null = null,
    imageMode: PrintImageMode = 'black-and-white',
): Promise<void> {
    const settings = loadPrinterSettings();

    if (settings.mode === 'rawbt') {
        await printWithRawBt(
            number,
            createdAt,
            brandName,
            sessionName,
            photo,
            settings.paperWidth,
            imageMode,
        );

        return;
    }

    if (settings.mode === 'web-bluetooth') {
        await printWithWebBluetooth(
            number,
            createdAt,
            brandName,
            sessionName,
            photo,
            settings,
            imageMode,
        );

        return;
    }

    if (settings.mode === 'browser-default') {
        printWithDefaultBrowser(
            number,
            createdAt,
            brandName,
            sessionName,
            photo,
            settings.paperWidth,
            imageMode,
        );

        return;
    }

    if (!import.meta.env.DEV) {
        throw new Error(
            'Dialog cetak browser hanya tersedia di development. Pilih RawBT atau Web Bluetooth untuk production.',
        );
    }

    printWithBrowser(
        number,
        createdAt,
        brandName,
        sessionName,
        photo,
        settings.paperWidth,
        imageMode,
    );
}

export async function printPrinterTest(
    brandName: string,
    sessionName: string,
    imageMode: PrintImageMode,
    createdAt = new Date().toISOString(),
): Promise<void> {
    await printQueueTicket(
        'UJI',
        createdAt,
        brandName,
        sessionName,
        printerTestPhotoUrl,
        imageMode,
    );
}

export function openAndroidBluetoothSettings(): void {
    window.location.assign(
        'intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end',
    );
}

export function openAndroidPrintSettings(): void {
    window.location.assign(
        'intent:#Intent;action=android.settings.ACTION_PRINT_SETTINGS;end',
    );
}

export const rawBtInstallUrl = `https://play.google.com/store/apps/details?id=${rawBtPackage}`;

async function printWithWebBluetooth(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null,
    settings: PrinterSettings,
    imageMode: PrintImageMode,
): Promise<void> {
    const device = await findRememberedDevice(settings.bluetoothDeviceId);
    const characteristic = await findWritableCharacteristic(device);
    bluetoothConnection = { device, characteristic };

    const bytes = await buildEscPosTicket(
        number,
        createdAt,
        brandName,
        sessionName,
        photo,
        settings.paperWidth,
        imageMode,
    );
    const chunkSize = 20;

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        await writeBluetoothChunk(
            characteristic,
            bytes.slice(offset, offset + chunkSize),
        );
    }
}

async function printWithRawBt(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null,
    paperWidth: PaperWidth,
    imageMode: PrintImageMode,
): Promise<void> {
    const bytes = await buildEscPosTicket(
        number,
        createdAt,
        brandName,
        sessionName,
        photo,
        paperWidth,
        imageMode,
    );
    window.location.assign(`rawbt:base64,${bytesToBase64(bytes)}`);
}

function printWithDefaultBrowser(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null,
    paperWidth: PaperWidth,
    imageMode: PrintImageMode,
): void {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText =
        'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.append(frame);

    const frameWindow = frame.contentWindow;
    if (!frameWindow) {
        frame.remove();
        window.print();

        return;
    }

    frameWindow.addEventListener('afterprint', () => frame.remove(), {
        once: true,
    });
    frameWindow.addEventListener(
        'load',
        () => {
            frameWindow.focus();
            frameWindow.print();
        },
        { once: true },
    );
    frameWindow.document.open();
    frameWindow.document.write(
        buildTicketMarkup(
            number,
            createdAt,
            brandName,
            sessionName,
            photo,
            paperWidth,
            imageMode,
        ),
    );
    frameWindow.document.close();
}

function printWithBrowser(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null,
    paperWidth: PaperWidth,
    imageMode: PrintImageMode,
): void {
    const popup = window.open('', '_blank', 'width=420,height=560');
    if (!popup) {
        printWithDefaultBrowser(
            number,
            createdAt,
            brandName,
            sessionName,
            photo,
            paperWidth,
            imageMode,
        );

        return;
    }

    popup.document.write(
        buildTicketMarkup(
            number,
            createdAt,
            brandName,
            sessionName,
            photo,
            paperWidth,
            imageMode,
            true,
        ),
    );
    popup.document.close();
}

function getBluetoothApi(): BluetoothApi | null {
    if (typeof navigator === 'undefined') {
        return null;
    }

    return (
        (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth ??
        null
    );
}

async function findRememberedDevice(
    deviceId: string | null,
): Promise<BluetoothDevice> {
    if (!deviceId) {
        throw new Error('Hubungkan printer BLE terlebih dahulu.');
    }

    if (bluetoothConnection?.device.id === deviceId) {
        return bluetoothConnection.device;
    }

    const bluetooth = getBluetoothApi();
    const devices = bluetooth?.getDevices ? await bluetooth.getDevices() : [];
    const device = devices.find((item) => item.id === deviceId);

    if (!device) {
        throw new Error(
            'Izin printer BLE tidak ditemukan. Hubungkan ulang dari halaman ini.',
        );
    }

    return device;
}

async function findWritableCharacteristic(
    device: BluetoothDevice,
): Promise<BluetoothCharacteristic> {
    const server = device.gatt;
    if (!server) {
        throw new Error('Printer tidak menyediakan koneksi BLE.');
    }

    const connectedServer = server.connected ? server : await server.connect();
    const services = await connectedServer.getPrimaryServices();

    for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const writable = characteristics.find(
            (characteristic) =>
                characteristic.properties.write ||
                characteristic.properties.writeWithoutResponse,
        );

        if (writable) {
            return writable;
        }
    }

    throw new Error(
        'Printer BLE tidak menyediakan kanal cetak yang dapat ditulis.',
    );
}

async function writeBluetoothChunk(
    characteristic: BluetoothCharacteristic,
    chunk: Uint8Array,
): Promise<void> {
    if (
        characteristic.properties.writeWithoutResponse &&
        characteristic.writeValueWithoutResponse
    ) {
        await characteristic.writeValueWithoutResponse(chunk);

        return;
    }

    if (characteristic.writeValueWithResponse) {
        await characteristic.writeValueWithResponse(chunk);

        return;
    }

    if (characteristic.writeValue) {
        await characteristic.writeValue(chunk);

        return;
    }

    throw new Error('Kanal cetak BLE tidak dapat menerima data.');
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}
