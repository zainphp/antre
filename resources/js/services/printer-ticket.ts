import { formatDateTime } from '@/utils/format';

export type PrintImageMode = 'full-color' | 'grayscale' | 'black-and-white';
export type PaperWidth = 58 | 80;

export const printerTestPhotoUrl = '/images/printer-test-photo.jpg';

const thermalPhotoWidthDots: Record<PaperWidth, number> = {
    58: 154,
    80: 230,
};
const thermalPhotoWidthMm: Record<PaperWidth, number> = {
    58: 23.2,
    80: 32,
};

export function buildTicketMarkup(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null,
    paperWidth: PaperWidth,
    imageMode: PrintImageMode,
    printOnLoad = false,
): string {
    const photoMarkup = photo
        ? `<img class="ticket-photo" src="${escapeHtml(photo)}" alt="Foto pelanggan" />`
        : '';
    const ticketWidth = paperWidth === 58 ? '50mm' : '72mm';
    const photoWidth = thermalPhotoWidthMm[paperWidth];
    const ticketStyles = [
        `@page{size:${paperWidth}mm auto;margin:0}`,
        'html,body{margin:0;padding:0;background:#fff}',
        '*,*::before,*::after{box-sizing:border-box}',
        'h1,h2,p,strong{margin:0;padding:0;border:0;font-weight:400}',
        'img{border:0;max-width:100%;vertical-align:middle}',
        `body{width:${ticketWidth};font-family:Arial,sans-serif;font-size:16px;line-height:1.2;text-align:center;margin:0 auto;padding:4mm 2mm;color:#17211c}`,
        'h1{font-size:13px;line-height:1.25;margin:0 0 3px}',
        'h2{font-size:11px;font-weight:400;line-height:1.3;margin:0 0 10px;color:#56645d}',
        `.ticket-photo{display:block;width:${photoWidth}mm;`,
        `height:${photoWidth}mm;object-fit:cover;border-radius:3mm;`,
        `filter:${getPhotoFilter(imageMode)};margin:0 auto 8px}`,
        `.ticket-number{display:block;font:700 ${paperWidth === 58 ? '48px' : '56px'} Georgia,serif;line-height:1;margin:8px 0 10px}`,
        '.ticket-note{font-size:10px;line-height:1.35;margin:0 0 5px}',
        '.ticket-date{font-size:9px;color:#56645d;margin:0}',
    ].join('');

    return [
        '<!doctype html><html lang="id"><head><meta charset="utf-8">',
        `<title>Tiket ${escapeHtml(number)}</title>`,
        `<style>${ticketStyles}</style></head><body>`,
        `<h1>${escapeHtml(brandName)}</h1>`,
        `<h2>${escapeHtml(sessionName)}</h2>`,
        photoMarkup,
        `<strong class="ticket-number">${escapeHtml(number)}</strong>`,
        '<p class="ticket-note">Silakan menunggu panggilan Anda.</p>',
        `<p class="ticket-date">${escapeHtml(formatDateTime(createdAt))}</p>`,
        printOnLoad
            ? "<script>window.addEventListener('load',()=>{window.print();window.close()})</script>"
            : '',
        '</body></html>',
    ].join('');
}

export async function buildEscPosTicket(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null,
    paperWidth: PaperWidth,
    imageMode: PrintImageMode,
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
        ? await buildEscPosImage(photo, paperWidth, imageMode)
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

function getPhotoFilter(imageMode: PrintImageMode): string {
    if (imageMode === 'full-color') {
        return 'none';
    }

    if (imageMode === 'grayscale') {
        return 'grayscale(1)';
    }

    return 'grayscale(1) contrast(4)';
}

async function buildEscPosImage(
    source: string,
    paperWidth: PaperWidth,
    imageMode: PrintImageMode,
): Promise<Uint8Array> {
    const image = await loadImage(source);
    const width = thermalPhotoWidthDots[paperWidth];
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
    const threshold = imageMode === 'black-and-white' ? 128 : 170;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const pixel = (y * width + x) * 4;
            const luminance = getLuminance(pixels, pixel, imageMode);

            if (luminance < threshold) {
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

function getLuminance(
    pixels: Uint8ClampedArray,
    pixel: number,
    imageMode: PrintImageMode,
): number {
    if (imageMode === 'grayscale') {
        return (
            pixels[pixel] * 0.2126 +
            pixels[pixel + 1] * 0.7152 +
            pixels[pixel + 2] * 0.0722
        );
    }

    return (
        pixels[pixel] * 0.299 +
        pixels[pixel + 1] * 0.587 +
        pixels[pixel + 2] * 0.114
    );
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
