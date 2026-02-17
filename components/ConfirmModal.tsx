import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    variant?: 'default' | 'toast';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDestructive = false,
    variant = 'default'
}) => {
    if (!isOpen) return null;

    const isToast = variant === 'toast';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`
                w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200
                ${isToast
                    ? 'bg-[#1e140f] border-l-4 rounded-r-xl rounded-l-none'
                    : 'bg-[#1e140f] border border-white/10 rounded-2xl'
                }
                ${isToast && isDestructive ? 'border-l-red-500' : ''}
                ${isToast && !isDestructive ? 'border-l-primary' : ''}
            `}>
                <div className={`flex items-center justify-between p-6 ${isToast ? '' : 'border-b border-white/5'}`}>
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${isToast ? 'text-white uppercase tracking-wider' : 'text-white'}`}>
                        {isDestructive && <AlertTriangle className={isToast ? 'text-red-500' : 'text-red-500'} size={24} />}
                        {!isDestructive && isToast && <AlertTriangle className="text-primary" size={24} />}
                        {title}
                    </h3>
                    {!isToast && (
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    )}
                </div>

                <div className={`px-6 ${isToast ? 'pb-6' : 'p-6'}`}>
                    <p className="text-gray-300 mb-6">{message}</p>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 rounded-lg font-bold transition-colors ${isToast
                                ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                : 'flex-1 border border-white/10 text-white hover:bg-white/5'
                                }`}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-4 py-2 rounded-lg text-white font-bold shadow-lg transition-all ${isToast ? '' : 'flex-1'
                                } ${isDestructive
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                    : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
