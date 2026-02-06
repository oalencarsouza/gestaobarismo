import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error';

interface ToastProps {
    message: string;
    type: NotificationType;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for transition
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    const bgColor = type === 'success' ? 'bg-white' : 'bg-white';
    const iconColor = type === 'success' ? 'text-green-500' : 'text-red-500';
    const textColor = 'text-gray-800';

    return (
        <div
            className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transform transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'} ${bgColor} border-l-4 ${type === 'success' ? 'border-l-green-500' : 'border-l-red-500'}`}
        >
            <div className={`${iconColor}`}>
                {type === 'success' ? (
                    <CheckCircle size={20} />
                ) : (
                    <XCircle size={20} />
                )}
            </div>
            <p className={`font-semibold text-sm ${textColor} mr-2`}>
                {message}
            </p>
            <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
            >
                <X size={16} />
            </button>
        </div>
    );
};
