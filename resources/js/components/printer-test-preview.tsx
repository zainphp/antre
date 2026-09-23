import Box from '@mui/material/Box';

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
};

export function PrinterTestPreview({
    brandName,
    createdAt,
    imageMode,
    paperWidth,
    sessionName,
}: PrinterTestPreviewProps) {
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
                    height: paperWidth === 58 ? 420 : 500,
                    width: paperWidth === 58 ? 232 : 320,
                }}
            />
        </Box>
    );
}
