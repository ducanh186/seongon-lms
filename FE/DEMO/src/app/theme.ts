import { alpha, createTheme } from '@mui/material/styles';

const teal = '#087E8B';
const ink = '#142B35';
const magenta = '#B62B71';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: teal, dark: '#075E68', light: '#DDF3F2', contrastText: '#FFFFFF' },
    secondary: { main: magenta, dark: '#8E1E57', contrastText: '#FFFFFF' },
    text: { primary: ink, secondary: '#52666F' },
    background: { default: '#F7FAFA', paper: '#FFFFFF' },
    divider: '#DCE6E8',
    success: { main: '#157A55' },
    error: { main: '#B42318' },
    warning: { main: '#A15C07' },
  },
  shape: { borderRadius: 14 },
  shadows: [
    'none',
    '0 1px 2px rgba(20,43,53,.06)',
    '0 4px 12px rgba(20,43,53,.07)',
    '0 8px 22px rgba(20,43,53,.08)',
    '0 14px 36px rgba(20,43,53,.10)',
    ...Array(20).fill('0 16px 44px rgba(20,43,53,.12)'),
  ] as unknown as import('@mui/material/styles').Shadows,
  typography: {
    fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.08 },
    h2: { fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.14 },
    h3: { fontWeight: 750, letterSpacing: '-0.02em', lineHeight: 1.2 },
    h4: { fontWeight: 750, letterSpacing: '-0.015em', lineHeight: 1.25 },
    h5: { fontWeight: 700, lineHeight: 1.3 },
    h6: { fontWeight: 700, lineHeight: 1.35 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { minWidth: 320 },
        '::selection': { background: alpha(magenta, 0.18) },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' },
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: { '&.Mui-focusVisible': { outline: `3px solid ${alpha(teal, 0.32)}`, outlineOffset: 3 } },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 44, borderRadius: 12, paddingInline: 18, transition: 'transform 160ms ease, background-color 160ms ease, border-color 160ms ease', '&:hover': { transform: 'translateY(-1px)' } },
      },
    },
    MuiCard: { styleOverrides: { root: { border: '1px solid', borderColor: '#DCE6E8', boxShadow: '0 8px 24px rgba(20,43,53,.07)' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiSkeleton: { defaultProps: { animation: 'wave' } },
  },
});
