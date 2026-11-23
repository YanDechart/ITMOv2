import { alpha, createTheme } from '@mui/material/styles';

export const palette = {
  ink: '#090909',
  surface: '#121212',
  raised: '#191919',
  milk: '#E9E7DD',
  muted: '#9C9C96',
  blue: '#00A8E8',
  red: '#D1122F',
  line: '#30302E',
};

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: palette.blue, contrastText: palette.ink },
    secondary: { main: palette.red },
    background: { default: palette.ink, paper: palette.surface },
    text: { primary: palette.milk, secondary: palette.muted },
    divider: palette.line,
    error: { main: '#FF3154' },
    success: { main: '#61D6A3' },
  },
  typography: {
    fontFamily: 'Inter, Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontSize: 'clamp(2.7rem, 6.5vw, 6rem)', fontWeight: 850, lineHeight: 0.88, letterSpacing: '-0.07em' },
    h2: { fontSize: 'clamp(1.65rem, 3vw, 2.55rem)', fontWeight: 750, letterSpacing: '-0.035em' },
    h3: { fontSize: '1.2rem', fontWeight: 720, letterSpacing: '-0.02em' },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.9rem', lineHeight: 1.55 },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: '-0.01em' },
  },
  shape: { borderRadius: 18 },
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.ink,
          backgroundImage: `radial-gradient(ellipse at 92% 12%, ${alpha(palette.red, 0.12)}, transparent 34%), radial-gradient(ellipse at 76% 25%, ${alpha(palette.blue, 0.1)}, transparent 38%), linear-gradient(180deg, ${palette.ink} 0%, #0B0B0B 46%, ${palette.ink} 100%)`,
        },
        '::selection': { background: alpha(palette.blue, 0.42), color: palette.milk },
        '*:focus-visible': { outline: `3px solid ${palette.blue}`, outlineOffset: '3px' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${palette.line}`,
          backgroundImage: 'none',
          boxShadow: '0 22px 60px rgba(0,0,0,.25)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, minHeight: 46, paddingInline: 20 },
        containedPrimary: { boxShadow: `0 10px 30px ${alpha(palette.blue, 0.18)}` },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#0D0D0D',
          borderRadius: 14,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: palette.line },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#5A5A56' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 2 },
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { border: `1px solid ${palette.line}`, backgroundImage: 'none' } },
    },
  },
});
