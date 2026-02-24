
import React from 'react';
import type { View } from '../App';

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
    const menuItems: SidebarItem[] = [
        { icon: 'shopping_cart', label: 'Pedidos', viewName: 'orders' },
        { icon: 'dashboard', label: 'Visão Geral', viewName: 'dashboard' },
        { icon: 'history', label: 'Histórico de Pedidos', viewName: 'history' },
        { icon: 'restaurant_menu', label: 'Cardápio', viewName: 'menu' },
        { icon: 'inventory_2', label: 'Estoque', viewName: 'stock' },
        { icon: 'analytics', label: 'Relatórios', viewName: 'reports' },
        { icon: 'person', label: 'Perfil', viewName: 'profile' },
    ];

    return (
        <aside className="w-64 border-r border-white/5 p-4 flex-col gap-6 bg-background-dark hidden md:flex">
            <div className="flex flex-col gap-1 px-3">
                <h1 className="text-white text-base font-bold leading-normal">{title}</h1>
                <p className="text-gray-500 text-xs font-normal">{subtitle}</p>
            </div>
            <div className="flex flex-col gap-2">
                {menuItems.map((item) => (
                    <SidebarLink
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        isActive={item.viewName === currentView}
                        onClick={() => item.viewName && setView(item.viewName)}
                    />
                ))}
            </div>
            <div className="mt-auto pt-4">
                <SidebarLink
                    icon="settings"
                    label="Configurações"
                    isActive={false}
                    onClick={() => { }}
                />
            </div>
        </aside>
    );
};
