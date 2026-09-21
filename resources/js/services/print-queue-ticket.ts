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

export function printQueueTicket(
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
