import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: NotificationType;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 4000 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        setIsVisible(true);
        setProgress(100);

        const startTime = Date.now();
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);

            if (remaining === 0) {
                clearInterval(progressInterval);
                setIsVisible(false);
                setTimeout(onClose, 400);
            }
        }, 10);

        return () => clearInterval(progressInterval);
    }, [message, duration, onClose]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 400);
    };

    const icons = {
        success: <CheckCircle className="text-emerald-400" size={20} />,
        error: <XCircle className="text-rose-400" size={20} />,
        info: <Info className="text-blue-400" size={20} />,
        warning: <AlertTriangle className="text-amber-400" size={20} />
    };

    const accentColors = {
        success: 'border-emerald-500/50 shadow-emerald-500/10',
        error: 'border-rose-500/50 shadow-rose-500/10',
        info: 'border-blue-500/50 shadow-blue-500/10',
        warning: 'border-amber-500/50 shadow-amber-500/10'
    };

    const progressColors = {
        success: 'bg-emerald-500',
        error: 'bg-rose-500',
        info: 'bg-blue-500',
        warning: 'bg-amber-500'
    };

    return (
        <div
            className={`fixed top-6 right-6 z-[200] flex flex-col min-w-[320px] max-w-[400px] overflow-hidden rounded-2xl border bg-zinc-900/80 backdrop-blur-xl shadow-2xl transition-all duration-500 ease-out transform ${accentColors[type]} ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}`}
        >
            <div className="flex items-center gap-4 p-4">
                <div className="flex-shrink-0 size-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    {icons[type]}
                </div>

                <div className="flex-1">
                    <p className="text-white font-bold text-sm leading-tight leading-relaxed">
                        {message}
                    </p>
                </div>

                <button
                    onClick={handleClose}
                    className="flex-shrink-0 size-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/5">
                <div
                    className={`h-full transition-all duration-100 linear ${progressColors[type]}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};
