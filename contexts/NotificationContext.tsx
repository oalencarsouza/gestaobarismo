import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Toast, NotificationType } from '../components/Toast';

interface NotificationContextData {
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextData>({} as NotificationContextData);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

    const showSuccess = useCallback((message: string) => {
        setNotification({ message, type: 'success' });
    }, []);

    const showError = useCallback((message: string) => {
        setNotification({ message, type: 'error' });
    }, []);

    const closeNotification = useCallback(() => {
        setNotification(null);
    }, []);

    return (
        <NotificationContext.Provider value={{ showSuccess, showError }}>
            {children}
            {notification && (
                <Toast
                    message={notification.message}
                    type={notification.type}
                    onClose={closeNotification}
                />
            )}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
