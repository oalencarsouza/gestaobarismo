import React, { useState } from 'react';
import type { View } from '../App';
import { supabase } from '../lib/supabase';
import { Lock, X } from 'lucide-react';

interface SidebarItem {
    icon: string;
    label: string;
    viewName?: View;
    onClick?: () => void;
}

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    title?: string;
    subtitle?: string;
}

const SidebarLink: React.FC<{
    icon: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <div
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isActive
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'text-gray-400 hover:bg-white/5'
            }`}
    >
        <span className="material-symbols-outlined">{icon}</span>
        <p className="text-sm font-medium">{label}</p>
    </div>
);

export const Sidebar: React.FC<SidebarProps> = ({
    currentView,
    setView,
    title = 'Gerenciamento',
    subtitle = 'Painel do Administrador'
}) => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [isLoadingAuth, setIsLoadingAuth] = useState(false);

    const menuItems: SidebarItem[] = [
        { icon: 'shopping_cart', label: 'Pedidos', viewName: 'orders' },
        { icon: 'dashboard', label: 'Visão Geral', viewName: 'dashboard' },
        { icon: 'history', label: 'Histórico de Pedidos', viewName: 'history' },
        { icon: 'restaurant_menu', label: 'Cardápio', viewName: 'menu' },
        { icon: 'inventory_2', label: 'Estoque', viewName: 'stock' },
        { icon: 'analytics', label: 'Relatórios', viewName: 'reports' },
        { icon: 'person', label: 'Perfil', viewName: 'profile' },
    ];

    const userRole = localStorage.getItem('userRole');
    const isViewer = userRole === 'viewer';

    const visibleMenuItems = menuItems.filter(item => {
        if (isViewer) {
            return ['orders', 'history', 'menu'].includes(item.viewName as string);
        }
        return true;
    });

    const handleSettingsClick = () => {
        setIsAuthModalOpen(true);
        setAdminPassword('');
        setAuthError('');
    };

    const verifyAdminPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoadingAuth(true);
        setAuthError('');

        try {
            const email = localStorage.getItem('username');
            if (!email || !email.includes('@')) {
                setAuthError('E-mail do administrador não encontrado');
                setIsLoadingAuth(false);
                return;
            }

            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: adminPassword,
            });

            if (error) {
                setAuthError('Senha incorreta. Acesso negado.');
                setIsLoadingAuth(false);
            } else {
                // Success!
                setIsAuthModalOpen(false);
                setView('settings');
                setIsLoadingAuth(false);
            }
        } catch (error) {
            setAuthError('Erro na verificação. Tente novamente.');
            setIsLoadingAuth(false);
        }
    };

    return (
        <aside className="w-64 border-r border-white/5 p-4 flex-col gap-6 bg-background-dark hidden md:flex relative z-50">
            <div className="flex flex-col gap-1 px-3">
                <h1 className="text-white text-base font-bold leading-normal text-shadow-sm">{title}</h1>
                <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest opacity-60">
                    {isViewer ? 'Acesso Operador' : subtitle}
                </p>
            </div>
            <div className="flex flex-col gap-2">
                {visibleMenuItems.map((item) => (
                    <SidebarLink
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        isActive={item.viewName === currentView}
                        onClick={() => item.viewName && setView(item.viewName)}
                    />
                ))}
            </div>
            {userRole === 'admin' && (
                <div className="mt-auto pt-4">
                    <SidebarLink
                        icon="settings"
                        label="Configurações"
                        isActive={currentView === 'settings'}
                        onClick={handleSettingsClick}
                    />
                </div>
            )}

            {/* Auth Modal para Configurações */}
            {isAuthModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-[#120f0e] border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsAuthModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="size-14 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                                <Lock className="text-orange-500" size={24} />
                            </div>
                            <h2 className="text-lg font-black text-white">Acesso Restrito</h2>
                            <p className="text-sm text-slate-400 mt-1">Confirme sua senha de administrador para acessar as configurações.</p>
                        </div>

                        <form onSubmit={verifyAdminPassword} className="space-y-4">
                            <div>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    placeholder="Sua senha de administrador"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all outline-none"
                                    autoFocus
                                />
                                {authError && (
                                    <p className="text-red-500 text-xs font-medium mt-2 flex items-center gap-1">
                                        {authError}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoadingAuth || !adminPassword}
                                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                            >
                                {isLoadingAuth ? (
                                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    'Confirmar Acesso'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </aside>
    );
};
