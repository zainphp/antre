export type PrinterMode = 'browser' | 'rawbt' | 'web-bluetooth';

export type PrinterSettings = {
    mode: PrinterMode;
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
        mode: 'browser',
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
        const mode = stored.mode;

        return {
            mode:
                mode === 'rawbt' || mode === 'web-bluetooth' ? mode : 'browser',
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
): Promise<void> {
    const settings = loadPrinterSettings();

    if (settings.mode === 'rawbt') {
        printWithRawBt(number, createdAt, brandName);

        return;
    }

    if (settings.mode === 'web-bluetooth') {
        await printWithWebBluetooth(number, createdAt, brandName, settings);

        return;
    }

    printWithBrowser(number, createdAt, brandName);
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
    settings: PrinterSettings,
): Promise<void> {
    const device = await findRememberedDevice(settings.bluetoothDeviceId);
    const characteristic = await findWritableCharacteristic(device);
    bluetoothConnection = { device, characteristic };

    const bytes = buildEscPosTicket(number, createdAt, brandName);
    const chunkSize = 20;

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        await writeBluetoothChunk(
            characteristic,
            bytes.slice(offset, offset + chunkSize),
        );
    }
}

function printWithRawBt(
    number: string,
    createdAt: string | null,
    brandName: string,
): void {
    const bytes = buildEscPosTicket(number, createdAt, brandName);
    window.location.assign(`rawbt:base64,${bytesToBase64(bytes)}`);
}

function printWithBrowser(
    number: string,
    createdAt: string | null,
    brandName: string,
): void {
    const popup = window.open('', '_blank', 'width=420,height=560');
    if (!popup) {
        window.print();

        return;
    }

    popup.document.write(
        `<!doctype html><title>Tiket ${escapeHtml(number)}</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:24px}h1{font-size:18px}strong{display:block;font:700 72px Georgia,serif;margin:36px 0}p{color:#56645d}</style><h1>${escapeHtml(brandName)}</h1><strong>${escapeHtml(number)}</strong><p>Silakan menunggu panggilan Anda.</p><p>${escapeHtml(createdAt ?? '')}</p><script>window.print();window.close();</script>`,
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

function buildEscPosTicket(
    number: string,
    createdAt: string | null,
    brandName: string,
): Uint8Array {
    return new TextEncoder().encode(
        [
            '\x1b\x40',
            '\x1b\x61\x01',
            `${brandName}\n`,
            '\x1b\x45\x01',
            '\x1d\x21\x11',
            `${number}\n`,
            '\x1d\x21\x00',
            '\x1b\x45\x00',
            'Silakan menunggu panggilan Anda.\n',
            `${createdAt ?? ''}\n\n\n`,
        ].join(''),
    );
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}

function escapeHtml(value: string): string {
    return value.replace(
        /[&<>'"]/g,
        (character) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;',
            })[character] ?? character,
    );
}
