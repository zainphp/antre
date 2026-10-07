export type UsbPrinterIdentity = {
    vendorId: number;
    productId: number;
    serialNumber: string | null;
    name: string;
};

type Endpoint = { direction: string; type: string; endpointNumber: number };
type Alternate = {
    alternateSetting: number;
    interfaceClass: number;
    endpoints: Endpoint[];
};
type Configuration = {
    configurationValue: number;
    interfaces: {
        interfaceNumber: number;
        alternates: Alternate[];
        alternate?: Alternate;
    }[];
};
type UsbDevice = {
    vendorId: number;
    productId: number;
    serialNumber?: string;
    productName?: string;
    opened: boolean;
    configurations: Configuration[];
    configuration?: Configuration | null;
    open: () => Promise<void>;
    close: () => Promise<void>;
    selectConfiguration: (value: number) => Promise<void>;
    claimInterface: (value: number) => Promise<void>;
    releaseInterface: (value: number) => Promise<void>;
    selectAlternateInterface: (
        interfaceNumber: number,
        alternate: number,
    ) => Promise<void>;
    transferOut: (
        endpoint: number,
        bytes: Uint8Array,
    ) => Promise<{ status: string; bytesWritten: number }>;
};
type UsbApi = {
    requestDevice: (options: {
        filters: { classCode: number }[];
    }) => Promise<UsbDevice>;
    getDevices: () => Promise<UsbDevice[]>;
    addEventListener: (
        event: 'disconnect',
        listener: (event: { device: UsbDevice }) => void,
    ) => void;
};
export type UsbPrinterState =
    | 'CONNECTED'
    | 'DISCONNECTED'
    | 'RECONNECTING'
    | 'FAILED';
let connection: {
    device: UsbDevice;
    interfaceNumber: number;
    endpoint: number;
} | null = null;
let state: UsbPrinterState = 'DISCONNECTED';
let connecting = false;
let printing = false;
const listeners = new Set<(state: UsbPrinterState) => void>();
const watchedApis = new WeakSet<UsbApi>();

function api(): UsbApi | null {
    if (
        typeof navigator === 'undefined' ||
        typeof window === 'undefined' ||
        !window.isSecureContext
    ) {
        return null;
    }
    return (navigator as Navigator & { usb?: UsbApi }).usb ?? null;
}
export function supportsWebUsb(): boolean {
    return api() !== null;
}
export function getUsbPrinterState(): UsbPrinterState {
    return state;
}
export function subscribeUsbPrinter(
    listener: (state: UsbPrinterState) => void,
): () => void {
    listeners.add(listener);
    listener(state);
    return () => {
        listeners.delete(listener);
    };
}
function setState(next: UsbPrinterState): void {
    state = next;
    listeners.forEach((listener) => listener(next));
}
export function matchesUsbPrinter(
    device: Pick<UsbDevice, 'vendorId' | 'productId' | 'serialNumber'>,
    saved: UsbPrinterIdentity,
): boolean {
    return (
        device.vendorId === saved.vendorId &&
        device.productId === saved.productId &&
        (!saved.serialNumber || device.serialNumber === saved.serialNumber)
    );
}
export function findUsbPrinterEndpoint(configurations: Configuration[]) {
    for (const interfaceClass of [7, 255]) {
        const candidates = configurations.flatMap((configuration) =>
            configuration.interfaces.flatMap((usbInterface) =>
                usbInterface.alternates.flatMap((alternate) =>
                    alternate.interfaceClass === interfaceClass
                        ? alternate.endpoints
                              .filter(
                                  (endpoint) =>
                                      endpoint.direction === 'out' &&
                                      endpoint.type === 'bulk',
                              )
                              .map((endpoint) => ({
                                  configuration:
                                      configuration.configurationValue,
                                  interfaceNumber: usbInterface.interfaceNumber,
                                  alternate: alternate.alternateSetting,
                                  endpoint: endpoint.endpointNumber,
                              }))
                        : [],
                ),
            ),
        );
        if (candidates.length === 1) {
            return candidates[0];
        }
        if (candidates.length > 1) {
            throw new Error(
                'Kanal USB printer tidak dapat dipilih secara aman. Gunakan dialog cetak.',
            );
        }
    }
    throw new Error('Printer tidak menyediakan kanal USB cetak yang didukung.');
}
export async function disconnectUsbPrinter(): Promise<void> {
    const previous = connection;
    connection = null;
    setState('DISCONNECTED');
    if (previous) {
        try {
            await previous.device.releaseInterface(previous.interfaceNumber);
        } catch {
            /* Device may already be unplugged. */
        }
        try {
            await previous.device.close();
        } catch {
            /* Device may already be unplugged. */
        }
    }
}
export async function connectUsbPrinter(
    saved: UsbPrinterIdentity | null = null,
): Promise<UsbPrinterIdentity> {
    const usb = api();
    if (!usb) {
        throw new Error(
            'USB langsung memerlukan HTTPS dan browser yang mendukung WebUSB, seperti Chrome Android.',
        );
    }
    if (printing || connecting) {
        throw new Error('Printer USB sedang digunakan. Tunggu proses selesai.');
    }
    connecting = true;
    setState('RECONNECTING');
    let selected: UsbDevice | undefined;
    let claimed: number | undefined;
    try {
        if (
            saved &&
            connection &&
            matchesUsbPrinter(connection.device, saved) &&
            connection.device.opened
        ) {
            setState('CONNECTED');
            return saved;
        }
        if (saved) {
            const devices = (await usb.getDevices()).filter((device) =>
                matchesUsbPrinter(device, saved),
            );
            if (devices.length !== 1) {
                throw new Error(
                    'Printer tersimpan tidak ditemukan atau ada beberapa printer yang sama. Pilih printer lagi di pengaturan.',
                );
            }
            selected = devices[0];
        } else {
            selected = await usb.requestDevice({
                filters: [{ classCode: 7 }, { classCode: 255 }],
            });
        }
        const channel = findUsbPrinterEndpoint(selected.configurations);
        await disconnectUsbPrinter();
        setState('RECONNECTING');
        if (!selected.opened) {
            await selected.open();
        }
        if (
            selected.configuration?.configurationValue !== channel.configuration
        ) {
            await selected.selectConfiguration(channel.configuration);
        }
        await selected.claimInterface(channel.interfaceNumber);
        claimed = channel.interfaceNumber;
        const current = selected.configuration?.interfaces.find(
            (item) => item.interfaceNumber === channel.interfaceNumber,
        )?.alternate;
        if (current?.alternateSetting !== channel.alternate) {
            await selected.selectAlternateInterface(
                channel.interfaceNumber,
                channel.alternate,
            );
        }
        connection = {
            device: selected,
            interfaceNumber: channel.interfaceNumber,
            endpoint: channel.endpoint,
        };
        if (!watchedApis.has(usb)) {
            usb.addEventListener('disconnect', (event) => {
                if (connection?.device === event.device) {
                    void disconnectUsbPrinter();
                }
            });
            watchedApis.add(usb);
        }
        setState('CONNECTED');
        return {
            vendorId: selected.vendorId,
            productId: selected.productId,
            serialNumber: selected.serialNumber || null,
            name: selected.productName || 'Printer USB',
        };
    } catch (reason) {
        if (selected && selected !== connection?.device) {
            if (claimed !== undefined) {
                try {
                    await selected.releaseInterface(claimed);
                } catch {
                    /* Best effort cleanup. */
                }
            }
            try {
                await selected.close();
            } catch {
                /* Best effort cleanup. */
            }
        }
        setState(connection ? 'CONNECTED' : 'FAILED');
        if (reason instanceof DOMException && reason.name === 'NotFoundError') {
            throw new Error('Pemilihan printer dibatalkan.');
        }
        if (reason instanceof DOMException) {
            throw new Error(
                'Printer USB belum dapat diakses. Izinkan akses USB dan tutup aplikasi cetak lain, lalu hubungkan ulang.',
            );
        }
        throw reason;
    } finally {
        connecting = false;
    }
}
export async function printUsbTicket(
    saved: UsbPrinterIdentity | null,
    build: () => Promise<Uint8Array>,
    autoCut: boolean,
): Promise<void> {
    if (printing || connecting) {
        throw new Error('Printer USB sedang digunakan. Tunggu proses selesai.');
    }
    const active = connection;
    if (
        !saved ||
        !active ||
        state !== 'CONNECTED' ||
        !active.device.opened ||
        !matchesUsbPrinter(active.device, saved)
    ) {
        throw new Error('Hubungkan ulang printer USB sebelum mencetak.');
    }
    printing = true;
    try {
        const ticket = await build();
        if (connection !== active) {
            throw new Error('Printer USB terputus.');
        }
        const finish = autoCut ? [0x1d, 0x56, 65, 0] : [0x1b, 0x64, 4];
        const bytes = new Uint8Array(ticket.length + finish.length);
        bytes.set(ticket);
        bytes.set(finish, ticket.length);
        for (let offset = 0; offset < bytes.length; offset += 16 * 1024) {
            if (connection !== active) {
                throw new Error('Printer USB terputus.');
            }
            const chunk = bytes.slice(offset, offset + 16 * 1024);
            const result = await active.device.transferOut(
                active.endpoint,
                chunk,
            );
            if (
                result.status !== 'ok' ||
                result.bytesWritten !== chunk.length
            ) {
                throw new Error('Data cetak USB tidak terkirim lengkap.');
            }
        }
    } catch (reason) {
        await disconnectUsbPrinter();
        setState('FAILED');
        const detail =
            reason instanceof Error ? reason.message : 'Pengiriman USB gagal.';
        throw new Error(
            `${detail} Tiket mungkin tercetak sebagian. Periksa kertas sebelum mencetak ulang.`,
        );
    } finally {
        printing = false;
    }
}
