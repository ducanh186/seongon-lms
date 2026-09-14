import { Alert, Snackbar } from '@mui/material';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

type AdminNotification = {
  id: number;
  message: string;
  createdAt: string;
};

type AdminNotificationContextValue = {
  notifications: AdminNotification[];
  pushNotification: (message: string) => void;
  clearNotifications: () => void;
};

const fallbackValue: AdminNotificationContextValue = {
  notifications: [],
  pushNotification: () => undefined,
  clearNotifications: () => undefined,
};

const AdminNotificationContext = createContext<AdminNotificationContextValue>(fallbackValue);

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [toast, setToast] = useState<AdminNotification | null>(null);

  const pushNotification = useCallback((message: string) => {
    const notification = {
      id: Date.now(),
      message,
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setNotifications((items) => [notification, ...items].slice(0, 10));
    setToast(notification);
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  return (
    <AdminNotificationContext.Provider value={{ notifications, pushNotification, clearNotifications }}>
      {children}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => setToast(null)}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotifications() {
  return useContext(AdminNotificationContext);
}
