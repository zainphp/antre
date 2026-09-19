import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function SectionHeading({
    eyebrow,
    title,
    detail,
}: {
    eyebrow?: string;
    title: string;
    detail?: string;
}) {
    return (
        <Box sx={{ mb: 2.5 }}>
            {eyebrow && <Typography className="eyebrow">{eyebrow}</Typography>}
            <Typography
                variant="h4"
                component="h2"
                sx={{ fontSize: { xs: '1.55rem', md: '1.9rem' } }}
            >
                {title}
            </Typography>
            {detail && (
                <Typography
                    color="text.secondary"
                    sx={{ mt: 0.5, maxWidth: 620 }}
                >
                    {detail}
                </Typography>
            )}
        </Box>
    );
}
