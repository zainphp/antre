export async function startCamera(
    video: HTMLVideoElement,
): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Kamera tidak tersedia di browser ini.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
    });
    video.srcObject = stream;
    await video.play();
    return stream;
}

export function stopCamera(stream: MediaStream | null): void {
    stream?.getTracks().forEach((track) => track.stop());
}

export function captureCamera(video: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas
        .getContext('2d')
        ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.78);
}

export function dataUrlToBlob(dataUrl: string): Blob {
    const [header, encoded] = dataUrl.split(',', 2);
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (character) =>
        character.charCodeAt(0),
    );
    return new Blob([bytes], {
        type: header.match(/:(.*?);/)?.[1] ?? 'image/jpeg',
    });
}
