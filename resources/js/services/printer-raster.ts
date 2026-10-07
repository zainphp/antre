import { formatDateTime } from '@/utils/format';
import {
    loadImage,
    packEscPosRaster,
    ticketLayout,
    type PaperWidth,
    type PrintImageMode,
} from '@/services/printer-ticket';

export function wrapTicketText(
    context: Pick<CanvasRenderingContext2D, 'measureText'>,
    text: string,
    width: number,
): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split(/\r?\n/)) {
        let line = '';
        for (const word of paragraph.split(/\s+/).filter(Boolean)) {
            if (line && context.measureText(line + word).width > width) {
                lines.push(line.trimEnd());
                line = '';
            }
            for (const character of Array.from(word)) {
                if (
                    line &&
                    context.measureText(line + character).width > width
                ) {
                    lines.push(line.trimEnd());
                    line = '';
                }
                line += character;
            }
            line += ' ';
        }
        lines.push(line.trimEnd());
    }
    return lines;
}

export function monochromeTicket(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    mode: PrintImageMode,
): { pixels: Uint8ClampedArray; raster: Uint8Array } {
    const values = new Float32Array(width * height);
    for (let index = 0; index < values.length; index++) {
        const offset = index * 4;
        const alpha = pixels[offset + 3] / 255;
        values[index] =
            (pixels[offset] * 0.2126 +
                pixels[offset + 1] * 0.7152 +
                pixels[offset + 2] * 0.0722) *
                alpha +
            255 * (1 - alpha);
    }
    const result = new Uint8ClampedArray(pixels.length);
    const bytesPerRow = Math.ceil(width / 8);
    const raster = new Uint8Array(bytesPerRow * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            const value = values[index] < 128 ? 0 : 255;
            result.set([value, value, value, 255], index * 4);
            if (!value) {
                raster[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x % 8);
            }
            if (mode !== 'black-and-white') {
                const error = values[index] - value;
                if (x + 1 < width) {
                    values[index + 1] += (error * 7) / 16;
                }
                if (y + 1 < height) {
                    if (x > 0) {
                        values[index + width - 1] += (error * 3) / 16;
                    }
                    values[index + width] += (error * 5) / 16;
                    if (x + 1 < width) {
                        values[index + width + 1] += error / 16;
                    }
                }
            }
        }
    }
    return { pixels: result, raster };
}

export async function renderUsbTicket(
    number: string,
    createdAt: string | null,
    brandName: string,
    sessionName: string,
    photo: string | null,
    paperWidth: PaperWidth,
    imageMode: PrintImageMode,
): Promise<{ preview: string; bytes: Uint8Array }> {
    await document.fonts.ready;
    const image = photo ? await loadImage(photo) : null;
    const canvas = document.createElement('canvas');
    const width = paperWidth === 58 ? 384 : 576;
    const cssWidth = (ticketLayout.bodyWidth[paperWidth] * 96) / 25.4;
    const scale = width / cssWidth;
    canvas.width = width;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
        throw new Error('Tiket belum dapat disiapkan untuk printer.');
    }
    const mm = (value: number) => (value * 96) / 25.4;
    const contentWidth = cssWidth - mm(4);
    const blocks: {
        text: string;
        font: string;
        y: number;
        color: string;
    }[] = [];
    let y = mm(4);
    const text = (
        value: string,
        font: string,
        lineHeight: number,
        gap: number,
        color = '#17211c',
    ) => {
        context.font = font;
        for (const line of wrapTicketText(context, value, contentWidth)) {
            blocks.push({ text: line, font, y, color });
            y += lineHeight;
        }
        y += gap;
    };
    text(
        brandName,
        `${ticketLayout.brandSize}px Arial`,
        ticketLayout.brandSize * 1.25,
        3,
    );
    text(
        sessionName,
        `${ticketLayout.sessionSize}px Arial`,
        ticketLayout.sessionSize * 1.3,
        10,
        '#56645d',
    );
    const photoY = y;
    const photoSize = mm(ticketLayout.photoWidth[paperWidth]);
    if (image) {
        y += photoSize + 8;
    }
    y += 8;
    const numberSize = ticketLayout.numberSize[paperWidth];
    text(number, `bold ${numberSize}px Georgia`, numberSize, 10);
    text('Silakan menunggu panggilan Anda.', '10px Arial', 13.5, 5);
    text(formatDateTime(createdAt), '9px Arial', 10.8, 0, '#56645d');
    canvas.height = Math.ceil((y + mm(4)) * scale);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);
    context.textAlign = 'center';
    context.textBaseline = 'top';
    for (const block of blocks) {
        context.font = block.font;
        context.fillStyle = block.color;
        context.fillText(block.text, cssWidth / 2, block.y);
    }
    if (image) {
        context.save();
        context.beginPath();
        context.roundRect(
            (cssWidth - photoSize) / 2,
            photoY,
            photoSize,
            photoSize,
            mm(3),
        );
        context.clip();
        context.filter =
            imageMode === 'black-and-white'
                ? 'grayscale(1) contrast(4)'
                : 'grayscale(1)';
        const crop = Math.min(image.naturalWidth, image.naturalHeight);
        context.drawImage(
            image,
            (image.naturalWidth - crop) / 2,
            (image.naturalHeight - crop) / 2,
            crop,
            crop,
            (cssWidth - photoSize) / 2,
            photoY,
            photoSize,
            photoSize,
        );
        context.restore();
    }
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height);
    const mono = monochromeTicket(
        rgba.data,
        canvas.width,
        canvas.height,
        imageMode,
    );
    rgba.data.set(mono.pixels);
    context.putImageData(rgba, 0, 0);
    const raster = packEscPosRaster(mono.raster, canvas.width, canvas.height);
    const bytes = new Uint8Array(5 + raster.length);
    bytes.set([0x1b, 0x40, 0x1b, 0x61, 0x01]);
    bytes.set(raster, 5);
    return { preview: canvas.toDataURL('image/png'), bytes };
}
