import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useEffect, useState } from 'react';
import { renderUsbTicket } from '@/services/printer-raster';

import {
    buildTicketMarkup,
    printerTestPhotoUrl,
    type PaperWidth,
    type PrintImageMode,
} from '@/services/printer';

type PrinterTestPreviewProps = {
    brandName: string;
    createdAt: string;
    imageMode: PrintImageMode;
    paperWidth: PaperWidth;
    sessionName: string;
    usb?: boolean;
};

export function PrinterTestPreview({
    brandName,
    createdAt,
    imageMode,
    paperWidth,
    sessionName,
    usb = false,
}: PrinterTestPreviewProps) {
    const [raster, setRaster] = useState<{
        source: string | null;
        error: string | null;
    }>({ source: null, error: null });
    useEffect(() => {
        if (!usb) {
            return;
        }
        let active = true;
        setRaster({ source: null, error: null });
        void renderUsbTicket(
            'UJI',
            createdAt,
            brandName,
            sessionName,
            printerTestPhotoUrl,
            paperWidth,
            imageMode,
        )
            .then((ticket) => {
                if (active) {
                    setRaster({ source: ticket.preview, error: null });
                }
            })
            .catch((reason: unknown) => {
                if (active) {
                    setRaster({
                        source: null,
                        error:
                            reason instanceof Error
                                ? reason.message
                                : 'Pratinjau belum tersedia.',
                    });
                }
            });
        return () => {
            active = false;
        };
    }, [usb, createdAt, brandName, sessionName, paperWidth, imageMode]);
    return (
        <Box
            sx={{
                alignItems: 'center',
                backgroundColor: '#eef3ef',
                borderRadius: 2,
                display: 'flex',
                justifyContent: 'center',
                minHeight: 260,
                mt: 2,
                p: 2,
            }}
        >
            {usb ? (
                raster.error ? (
                    <Alert severity="error">{raster.error}</Alert>
                ) : raster.source ? (
                    <Box
                        component="img"
                        src={raster.source}
                        alt="Pratinjau tiket USB hitam putih"
                        sx={{
                            width: paperWidth === 58 ? 232 : 320,
                            maxWidth: '100%',
                            height: 'auto',
                            imageRendering: 'pixelated',
                        }}
                    />
                ) : (
                    <CircularProgress aria-label="Menyiapkan pratinjau tiket" />
                )
            ) : (
                <Box
                    component="iframe"
                    title="Pratinjau tiket uji"
                    srcDoc={buildTicketMarkup(
                        'UJI',
                        createdAt,
                        brandName,
                        sessionName,
                        printerTestPhotoUrl,
                        paperWidth,
                        imageMode,
                    )}
                    sx={{
                        backgroundColor: '#fff',
                        border: '1px solid #dfe7e1',
                        borderRadius: 1,
                        boxShadow: '0 8px 20px rgba(18, 72, 59, 0.1)',
                        display: 'block',
                        height: paperWidth === 58 ? 280 : 320,
                        maxWidth: '100%',
                        width: paperWidth === 58 ? 232 : 320,
                    }}
                />
            )}
        </Box>
    );
}
