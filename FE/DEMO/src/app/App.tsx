import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/be-vietnam-pro/800.css';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router';
import { CartProvider } from './cart/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './routes';
import { theme } from './theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider><CartProvider><RouterProvider router={router} /></CartProvider></AuthProvider>
    </ThemeProvider>
  );
}
