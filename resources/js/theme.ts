import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#12483b',
            dark: '#0a3027',
            light: '#2f765f',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#b88737',
            dark: '#765316',
            light: '#d4a854',
            contrastText: '#17130b',
        },
        background: { default: '#f5f7f2', paper: '#ffffff' },
        text: { primary: '#17211c', secondary: '#56645d' },
        divider: '#dfe6df',
        success: { main: '#23795a' },
        warning: { main: '#9a651c' },
        error: { main: '#b33c32' },
    },
    typography: {
        fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        h1: {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 500,
            letterSpacing: '-0.035em',
        },
        h2: {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 500,
            letterSpacing: '-0.025em',
        },
        h3: { fontWeight: 700, letterSpacing: '-0.02em' },
        button: {
            fontWeight: 700,
            textTransform: 'none',
            letterSpacing: '0.01em',
        },
        body1: { lineHeight: 1.6 },
        body2: { lineHeight: 1.5 },
    },
    shape: { borderRadius: 14 },
    components: {
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { minHeight: 48, borderRadius: 10, paddingInline: 18 },
            },
        },
        MuiIconButton: {
            styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
        },
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
        MuiCard: {
            styleOverrides: {
                root: {
                    border: '1px solid #dfe6df',
                    boxShadow: '0 10px 30px rgba(18,72,59,0.06)',
                },
            },
        },
        MuiTextField: { defaultProps: { variant: 'outlined', size: 'small' } },
    },
});
