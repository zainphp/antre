import {
    buildEscPosTicket,
    buildTicketMarkup,
    printerTestPhotoUrl,
} from '@/services/printer-ticket';
import type { PaperWidth, PrintImageMode } from '@/services/printer-ticket';
import { formatDateTime } from '@/utils/format';
import { renderUsbTicket } from '@/services/printer-raster';
import {
    disconnectUsbPrinter,
    printUsbTicket,
    type UsbPrinterIdentity,
} from '@/services/printer-usb';
export {
    connectUsbPrinter,
    getUsbPrinterState,
    subscribeUsbPrinter,
    supportsWebUsb,
} from '@/services/printer-usb';

export {
    buildTicketMarkup,
    printerTestPhotoUrl,
} from '@/services/printer-ticket';
export type { PaperWidth, PrintImageMode } from '@/services/printer-ticket';

export type PrinterMode =
    | 'iframe'
    | 'window'
    | 'android-intent'
    | 'web-usb'
    | 'web-bluetooth';
export type PrinterSettings = {
    mode: PrinterMode | null;
    androidApp: AndroidPrinterApp | null;
    paperWidth: PaperWidth;
    imageMode: PrintImageMode;
    bluetoothDeviceId: string | null;
    bluetoothDeviceName: string | null;
    usbDevice: UsbPrinterIdentity | null;
    usbAutoCut: boolean;
};
export type PrinterOperatingSystem =
    | 'android'
    | 'ios'
    | 'linux'
    | 'macos'
    | 'unknown'
    | 'windows';

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
    addEventListener?: (
        type: 'gattserverdisconnected',
        listener: () => void,
    ) => void;
};

type BluetoothApi = {
    requestDevice: (options: {
        acceptAllDevices: boolean;
        optionalServices: string[];
    }) => Promise<BluetoothDevice>;
    getDevices?: () => Promise<BluetoothDevice[]>;
};

const STORAGE_KEY = 'antre.queue-terminal.printer';
export const androidPrinterApps = [
    {
        id: 'rawbt',
        name: 'RawBT',
        package: 'ru.a402d.rawbtprinter',
        transport: null,
    },
    {
        id: 'quick-printer',
        name: 'Quick Printer',
        package: 'pe.diegoveloper.printerserverapp',
        transport: null,
    },
    {
        id: 'looped-usb',
        name: 'ESC POS USB — Looped Labs',
        package: 'com.loopedlabs.usbprintservice',
        transport: 'usb',
    },
    {
        id: 'looped-bluetooth',
        name: 'ESC POS Bluetooth — Looped Labs',
        package: 'com.loopedlabs.escposprintservice',
        transport: 'bt',
    },
    {
        id: 'looped-wifi',
        name: 'ESC POS Wi-Fi — Looped Labs',
        package: 'com.loopedlabs.netprintservice',
        transport: 'net',
    },
] as const;
export type AndroidPrinterApp = (typeof androidPrinterApps)[number]['id'];
const bluetoothServiceUuids = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

let bluetoothConnection: {
    device: BluetoothDevice;
    characteristic: BluetoothCharacteristic;
} | null = null;

export function getPrinterOperatingSystem(): PrinterOperatingSystem {
    if (typeof navigator === 'undefined') {
        return 'unknown';
    }

    const browserNavigator = navigator as Navigator & {
        userAgentData?: { platform?: string };
    };
    const platform = [
        browserNavigator.userAgentData?.platform,
        navigator.platform,
        navigator.userAgent,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    if (platform.includes('android')) {
        return 'android';
    }

    if (platform.includes('iphone') || platform.includes('ipad')) {
        return 'ios';
    }

    if (platform.includes('win')) {
        return 'windows';
    }

    if (platform.includes('mac')) {
        return 'macos';
    }

    if (platform.includes('linux')) {
        return 'linux';
    }

    return 'unknown';
}

export function loadPrinterSettings(): PrinterSettings {
    const defaults: PrinterSettings = {
        mode: null,
        androidApp: 'rawbt',
        paperWidth: 58,
        imageMode: 'black-and-white',
        bluetoothDeviceId: null,
        bluetoothDeviceName: null,
        usbDevice: null,
        usbAutoCut: true,
    };

    if (typeof window === 'undefined') {
        return defaults;
    }

    try {
        const stored = JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) ?? '{}',
        ) as Partial<PrinterSettings>;
        const mode = normalizePrinterMode((stored as { mode?: unknown }).mode);

        return {
            mode,
            usbDevice: validUsbIdentity(stored.usbDevice)
                ? stored.usbDevice
                : null,
            usbAutoCut:
                typeof stored.usbAutoCut === 'boolean'
                    ? stored.usbAutoCut
                    : true,
            androidApp:
                stored.androidApp === undefined
                    ? defaults.androidApp
                    : (androidPrinterApps.find(
                          (app) => app.id === stored.androidApp,
                      )?.id ?? null),
            paperWidth: stored.paperWidth === 80 ? 80 : 58,
            imageMode: isPrintImageMode(stored.imageMode)
                ? stored.imageMode
                : defaults.imageMode,
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
    if (settings.mode !== 'web-usb') {
        void disconnectUsbPrinter();
    }
}

function validUsbIdentity(value: unknown): value is UsbPrinterIdentity {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const device = value as Partial<UsbPrinterIdentity>;
    return (
        Number.isInteger(device.vendorId) &&
        device.vendorId! >= 0 &&
        device.vendorId! <= 65535 &&
        Number.isInteger(device.productId) &&
        device.productId! >= 0 &&
        device.productId! <= 65535 &&
        (device.serialNumber === null ||
            typeof device.serialNumber === 'string') &&
        typeof device.name === 'string'
    );
}

export function supportsWebBluetooth(): boolean {
    return getBluetoothApi() !== null;
}

export async function pairWebBluetoothPrinter(
    onDisconnected?: () => void,
): Promise<{
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

    rememberBluetoothConnection(device, characteristic, onDisconnected);

    return {
        id: device.id,
        name: device.name ?? 'Printer BLE',
    };
}

export async function connectRememberedWebBluetoothPrinter(
    settings: PrinterSettings,
    onDisconnected?: () => void,
): Promise<void> {
    if (settings.mode !== 'web-bluetooth') {
        throw new Error('Metode cetak Web Bluetooth belum dipilih.');
    }

    const device = await findRememberedDevice(settings.bluetoothDeviceId);
    const characteristic = await findWritableCharacteristic(device);

    rememberBluetoothConnection(device, characteristic, onDisconnected);
}

export async function repairWebBluetoothPrinter(
    settings: PrinterSettings,
    onDisconnected?: () => void,
): Promise<{ id: string; name: string }> {
    if (settings.mode !== 'web-bluetooth') {
        throw new Error('Metode cetak Web Bluetooth belum dipilih.');
    }

    if (bluetoothConnection?.device.id === settings.bluetoothDeviceId) {
        const device = bluetoothConnection.device;
        const characteristic = await findWritableCharacteristic(device);

        rememberBluetoothConnection(device, characteristic, onDisconnected);

        return {
            id: device.id,
            name: device.name ?? 'Printer BLE',
        };
    }

    return pairWebBluetoothPrinter(onDisconnected);
}

export async function printQueueTicket(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null = null,
    imageMode?: PrintImageMode,
): Promise<void> {
    const settings = loadPrinterSettings();
    const selectedImageMode = imageMode ?? settings.imageMode;

    if (settings.mode === null) {
        throw new Error('Metode cetak belum dikonfigurasi.');
    }

    if (settings.mode === 'web-usb') {
        await printUsbTicket(
            settings.usbDevice,
            async () =>
                (
                    await renderUsbTicket(
                        number,
                        createdAt,
                        brandName,
                        sessionName,
                        photo,
                        settings.paperWidth,
                        selectedImageMode,
                    )
                ).bytes,
            settings.usbAutoCut,
        );
        return;
    }

    if (settings.mode === 'android-intent') {
        await printWithAndroidIntent(
            number,
            createdAt,
            brandName,
            sessionName,
            photo,
            settings.paperWidth,
            selectedImageMode,
            settings.androidApp,
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
            selectedImageMode,
        );

        return;
    }

    if (settings.mode === 'iframe') {
        printWithIframe(
            number,
            createdAt,
            brandName,
            sessionName,
            photo,
            settings.paperWidth,
            selectedImageMode,
        );

        return;
    }

    printWithTicketWindow(
        number,
        createdAt,
        brandName,
        sessionName,
        photo,
        settings.paperWidth,
        selectedImageMode,
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

export function getAndroidPrintInstallUrl(app: AndroidPrinterApp): string {
    const profile = androidPrinterApps.find((profile) => profile.id === app)!;
    return `https://play.google.com/store/apps/details?id=${profile.package}`;
}

export function buildAndroidPrintIntent(
    app: AndroidPrinterApp,
    payload: string,
): string {
    const profile = androidPrinterApps.find((profile) => profile.id === app)!;
    const fallback = encodeURIComponent(getAndroidPrintInstallUrl(app));

    if (app === 'quick-printer') {
        return `intent://${encodeURIComponent(payload)}#Intent;scheme=quickprinter;package=${profile.package};S.browser_fallback_url=${fallback};end`;
    }

    if (app === 'rawbt') {
        return `intent:base64,${payload}#Intent;scheme=rawbt;package=${profile.package};S.browser_fallback_url=${fallback};end`;
    }

    const source = encodeURIComponent(
        `'data:text/html;charset=utf-8,${encodeURIComponent(payload)}'`,
    ).replace(/'/g, '%27');
    return `intent://escpos.org/escpos/${profile.transport}/print?srcTp=uri&srcObj=html&src=${source}#Intent;scheme=print;package=${profile.package};S.browser_fallback_url=${fallback};end`;
}

async function printWithWebBluetooth(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null,
    settings: PrinterSettings,
    imageMode: PrintImageMode,
): Promise<void> {
    await connectRememberedWebBluetoothPrinter(settings);
    const characteristic = bluetoothConnection?.characteristic;

    if (!characteristic) {
        throw new Error(
            `Printer ${settings.bluetoothDeviceName ?? 'BLE'} belum siap digunakan.`,
        );
    }

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

async function printWithAndroidIntent(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null,
    paperWidth: PaperWidth,
    imageMode: PrintImageMode,
    app: AndroidPrinterApp | null,
): Promise<void> {
    if (app === null) {
        throw new Error('Pilih aplikasi cetak di pengaturan printer.');
    }

    if (app === 'quick-printer') {
        const photoUrl = photo ? new URL(photo, window.location.href) : null;
        if (photoUrl && !['http:', 'https:'].includes(photoUrl.protocol)) {
            throw new Error(
                'Quick Printer hanya mendukung foto dari URL publik. Untuk foto kamera, pilih Looped Labs atau RawBT.',
            );
        }
        const text = (value: string) => value.replace(/[<>\p{Cc}]/gu, ' ');
        const commands = [
            '<PRINTER avoid_dialog><CENTER><NORMAL>',
            `${text(brandName)}<BR>${text(sessionName)}<BR>`,
            photoUrl ? `<IMAGE>${photoUrl.href}<BR>` : '',
            `<BIG><BOLD>${text(number)}<BR><NORMAL><SMALL>`,
            'Silakan menunggu panggilan Anda.<BR>',
            `${text(formatDateTime(createdAt))}<BR><BR><BR><CUT>`,
        ].join('');
        window.location.assign(buildAndroidPrintIntent(app, commands));

        return;
    }

    if (app !== 'rawbt') {
        const markup = buildTicketMarkup(
            number,
            createdAt,
            brandName,
            sessionName,
            photo ? new URL(photo, window.location.href).href : null,
            paperWidth,
            imageMode,
        );
        window.location.assign(buildAndroidPrintIntent(app, markup));

        return;
    }

    const bytes = await buildEscPosTicket(
        number,
        createdAt,
        brandName,
        sessionName,
        photo,
        paperWidth,
        imageMode,
    );
    window.location.assign(buildAndroidPrintIntent(app, bytesToBase64(bytes)));
}

function printWithIframe(
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

    frameWindow.document.open();
    frameWindow.addEventListener('afterprint', () => frame.remove(), {
        once: true,
    });
    frameWindow.addEventListener(
        'load',
        () => {
            sizeTicketPage(frameWindow, paperWidth);
            frameWindow.focus();
            frameWindow.print();
        },
        { once: true },
    );
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

function printWithTicketWindow(
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
        printWithIframe(
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

    popup.document.open();
    popup.addEventListener('afterprint', () => popup.close(), { once: true });
    popup.addEventListener(
        'load',
        () => {
            sizeTicketPage(popup, paperWidth);
            popup.focus();
            popup.print();
        },
        { once: true },
    );
    popup.document.write(
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
    popup.document.close();
}

function sizeTicketPage(printWindow: Window, paperWidth: PaperWidth): void {
    const printDocument = printWindow.document;
    const height = printDocument.body.getBoundingClientRect().height;
    const heightMm = Math.ceil(((height + 1) * 25.4) / 96);
    const style = printDocument.createElement('style');
    style.textContent = `@page{size:${paperWidth}mm ${heightMm}mm;margin:0}`;
    printDocument.head.append(style);
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

function rememberBluetoothConnection(
    device: BluetoothDevice,
    characteristic: BluetoothCharacteristic,
    onDisconnected?: () => void,
): void {
    bluetoothConnection = { device, characteristic };

    if (onDisconnected) {
        device.addEventListener?.('gattserverdisconnected', onDisconnected);
    }
}

function isPrintImageMode(value: unknown): value is PrintImageMode {
    return (
        value === 'full-color' ||
        value === 'grayscale' ||
        value === 'black-and-white'
    );
}

function normalizePrinterMode(value: unknown): PrinterMode | null {
    if (value === undefined || value === null) {
        return null;
    }

    if (value === 'browser-default') {
        return getDefaultPrinterMode();
    }

    if (value === 'iframe') {
        return 'iframe';
    }

    if (value === 'android-intent' || value === 'rawbt') {
        return getPrinterOperatingSystem() === 'android'
            ? 'android-intent'
            : getDefaultPrinterMode();
    }

    if (value === 'web-bluetooth' || value === 'web-usb') {
        return value;
    }

    if (value === 'window' || value === 'browser') {
        return 'window';
    }

    return null;
}

function getDefaultPrinterMode(): PrinterMode {
    const operatingSystem = getPrinterOperatingSystem();

    return operatingSystem === 'windows' ||
        operatingSystem === 'macos' ||
        operatingSystem === 'linux'
        ? 'window'
        : 'iframe';
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
