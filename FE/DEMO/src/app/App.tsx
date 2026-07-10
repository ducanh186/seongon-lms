import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { RouterProvider } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './routes';

const theme = createTheme({
  palette: {
    primary: { main: '#007E87', dark: '#005B61', contrastText: '#FFFFFF' },
    secondary: { main: '#BC2672' },
    background: { default: '#FFFFFF', paper: '#FFFFFF' },
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: 'Arial, Helvetica, sans-serif', button: { fontWeight: 700, textTransform: 'none' } },
  components: { MuiButton: { styleOverrides: { root: { minHeight: 42 } } } },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider><RouterProvider router={router} /></AuthProvider>
    </ThemeProvider>
  );
}
