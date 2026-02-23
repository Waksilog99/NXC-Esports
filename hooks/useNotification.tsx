import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    duration?: number;
}

interface NotificationContextType {
    showNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
    notifications: Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const showNotification = useCallback(({ message, type, duration = 5000 }: Omit<Notification, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications(prev => [...prev, { id, message, type, duration }]);

        if (duration !== Infinity) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }, [removeNotification]);

    return (
        <NotificationContext.Provider value={{ showNotification, removeNotification, notifications }}>
            {children}
            <NotificationContainer />
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

// Internal container component to render the toasts
const NotificationContainer: React.FC = () => {
    const { notifications, removeNotification } = useNotification();

    return (
        <div className="fixed top-8 right-8 z-[9999] flex flex-col gap-4 pointer-events-none max-w-md w-full sm:w-[400px]">
            {notifications.map(n => (
                <NotificationItem key={n.id} notification={n} onClose={() => removeNotification(n.id)} />
            ))}
        </div>
    );
};

const NotificationItem: React.FC<{ notification: Notification; onClose: () => void }> = ({ notification, onClose }) => {
    const icons = {
        success: (
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        error: (
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        info: (
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        warning: (
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        )
    };

    const styles = {
        success: 'border-emerald-500/20 shadow-emerald-500/10',
        error: 'border-red-500/20 shadow-red-500/10',
        info: 'border-blue-500/20 shadow-blue-500/10',
        warning: 'border-amber-500/20 shadow-amber-500/10'
    };

    return (
        <div
            className={`pointer-events-auto flex items-center gap-4 p-5 bg-[#020617]/90 backdrop-blur-2xl border ${styles[notification.type]} rounded-[24px] shadow-2xl animate-in fade-in slide-in-from-right-10 duration-500 group overflow-hidden relative`}
            onClick={onClose}
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" style={{ color: notification.type === 'success' ? '#10b981' : notification.type === 'error' ? '#ef4444' : notification.type === 'warning' ? '#f59e0b' : '#3b82f6' }} />

            <div className="flex-shrink-0 p-2 bg-white/5 rounded-xl border border-white/5">
                {icons[notification.type]}
            </div>

            <div className="flex-grow">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-1 leading-none">{notification.type}</p>
                <p className="text-[13px] font-bold text-white tracking-tight leading-relaxed">{notification.message}</p>
            </div>

            <button className="flex-shrink-0 p-2 text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};
