
import React from 'react';
import { ShoppingCart, Settings } from 'lucide-react';

interface WelcomeModalProps {
    isOpen: boolean;
    onNewOrder: () => void;
    onManagement: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
    isOpen, onNewOrder, onManagement
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
            <div className="bg-background-dark/95 border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 p-8 flex flex-col items-center gap-8">
                {/* Logo / Welcome */}
                <div className="text-center flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '32px' }}>
                            coffee
                        </span>
                    </div>
                    <div>
                        <h2 className="text-white text-2xl font-black tracking-tight">
                            Bem-vindo!
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            O que deseja fazer?
                        </p>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={onNewOrder}
                        className="group flex items-center gap-4 w-full p-4 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-all"
                    >
                        <div className="w-12 h-12 rounded-xl bg-primary/20 group-hover:bg-primary/30 flex items-center justify-center transition-colors">
                            <ShoppingCart size={22} className="text-primary" />
                        </div>
                        <div className="text-left">
                            <span className="text-white font-bold text-base block">Novo Pedido</span>
                            <span className="text-gray-400 text-xs">Criar pedido para um cliente</span>
                        </div>
                    </button>

                    <button
                        onClick={onManagement}
                        className="group flex items-center gap-4 w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white/10 group-hover:bg-white/15 flex items-center justify-center transition-colors">
                            <Settings size={22} className="text-gray-300" />
                        </div>
                        <div className="text-left">
                            <span className="text-white font-bold text-base block">Gerenciamento</span>
                            <span className="text-gray-400 text-xs">Acessar painel completo</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
