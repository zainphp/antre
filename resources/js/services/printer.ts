import { formatDateTime } from '@/utils/format';

export type PrinterMode = 'browser' | 'rawbt' | 'web-bluetooth';
export type PaperWidth = 58 | 80;

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
        mode: 'browser',
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
        const mode = stored.mode;

        return {
            mode:
                mode === 'rawbt' || mode === 'web-bluetooth' ? mode : 'browser',
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
        );

        return;
    }

    printWithBrowser(
        number,
        createdAt,
        brandName,
        sessionName,
        photo,
        settings.paperWidth,
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
): Promise<void> {
    const bytes = await buildEscPosTicket(
        number,
        createdAt,
        brandName,
        sessionName,
        photo,
        paperWidth,
    );
    window.location.assign(`rawbt:base64,${bytesToBase64(bytes)}`);
}

function printWithBrowser(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null,
    paperWidth: PaperWidth,
): void {
    const popup = window.open('', '_blank', 'width=420,height=560');
    if (!popup) {
        window.print();

        return;
    }

    const photoMarkup = photo
        ? `<img class="ticket-photo" src="${escapeHtml(photo)}" alt="Foto pelanggan" />`
        : '';
    const ticketWidth = paperWidth === 58 ? '50mm' : '72mm';

    popup.document.write(
        `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Tiket ${escapeHtml(number)}</title><style>@page{size:${paperWidth}mm auto;margin:0}*{box-sizing:border-box}body{width:${ticketWidth};font-family:Arial,sans-serif;text-align:center;margin:0 auto;padding:4mm 2mm;color:#17211c}h1{font-size:13px;line-height:1.25;margin:0 0 3px}h2{font-size:11px;font-weight:400;line-height:1.3;margin:0 0 10px;color:#56645d}.ticket-photo{display:block;width:24mm;height:24mm;object-fit:cover;border-radius:4mm;margin:0 auto 8px}.ticket-number{display:block;font:700 ${paperWidth === 58 ? '48px' : '56px'} Georgia,serif;line-height:1;margin:8px 0 10px}.ticket-note{font-size:10px;line-height:1.35;margin:0 0 5px}.ticket-date{font-size:9px;color:#56645d;margin:0}</style></head><body><h1>${escapeHtml(brandName)}</h1><h2>${escapeHtml(sessionName)}</h2>${photoMarkup}<strong class="ticket-number">${escapeHtml(number)}</strong><p class="ticket-note">Silakan menunggu panggilan Anda.</p><p class="ticket-date">${escapeHtml(formatDateTime(createdAt))}</p><script>window.addEventListener('load',()=>{window.print();window.close()})</script></body></html>`,
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

async function buildEscPosTicket(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null,
    paperWidth: PaperWidth,
): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const header = encoder.encode(
        [
            '\x1b\x40',
            '\x1b\x61\x01',
            `${brandName}\n`,
            `\x1b\x45\x01${sessionName}\n\x1b\x45\x00`,
        ].join(''),
    );
    const image = photo
        ? await buildEscPosImage(photo, paperWidth)
        : new Uint8Array();
    const details = encoder.encode(
        [
            '\x1b\x45\x01',
            '\x1d\x21\x11',
            `${number}\n`,
            '\x1d\x21\x00',
            '\x1b\x45\x00',
            'Silakan menunggu panggilan Anda.\n',
            `${formatDateTime(createdAt)}\n\n\n`,
        ].join(''),
    );

    return joinBytes(header, image, details);
}

async function buildEscPosImage(
    source: string,
    paperWidth: PaperWidth,
): Promise<Uint8Array> {
    const image = await loadImage(source);
    const width = paperWidth === 58 ? 384 : 576;
    const height = Math.max(
        1,
        Math.round((image.naturalHeight / image.naturalWidth) * width),
    );
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
        throw new Error('Foto belum dapat disiapkan untuk printer.');
    }

    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const bytesPerRow = Math.ceil(width / 8);
    const raster = new Uint8Array(bytesPerRow * height);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const pixel = (y * width + x) * 4;
            const luminance =
                pixels[pixel] * 0.299 +
                pixels[pixel + 1] * 0.587 +
                pixels[pixel + 2] * 0.114;

            if (luminance < 170) {
                raster[y * bytesPerRow + Math.floor(x / 8)] |= 0x80 >> (x % 8);
            }
        }
    }

    const command = new Uint8Array(8 + raster.length);
    command.set([
        0x1d,
        0x76,
        0x30,
        0x00,
        bytesPerRow & 0xff,
        (bytesPerRow >> 8) & 0xff,
        height & 0xff,
        (height >> 8) & 0xff,
    ]);
    command.set(raster, 8);

    return command;
}

function loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Foto belum dapat dibaca.'));
        image.src = source;
    });
}

function joinBytes(...parts: Uint8Array[]): Uint8Array {
    const result = new Uint8Array(
        parts.reduce((length, part) => length + part.length, 0),
    );
    let offset = 0;

    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
    }

    return result;
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
