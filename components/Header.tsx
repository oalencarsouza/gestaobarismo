import React from 'react';
import { LogOut, Menu } from 'lucide-react';

interface HeaderProps {
    onLogout?: () => void;
    onMenuClick?: () => void;
}
export const Header: React.FC<HeaderProps> = ({ onLogout, onMenuClick }) => {
    const userRole = localStorage.getItem('userRole');
    const profileImage = userRole === 'admin' ? 'url("/admin-profile.png")' : 'url("/logo.svg")';

    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-white/10 px-4 md:px-10 py-3 bg-background-dark sticky top-0 z-50">
            <div className="flex items-center gap-4">
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        className="p-2 text-zinc-400 hover:text-white transition-colors md:hidden bg-white/5 rounded-lg"
                    >
                        <Menu size={24} />
                    </button>
                )}
                <div className="flex items-center gap-4 text-primary">
                    <div className="size-8 flex items-center justify-center">
                        <img src="/logo.svg" alt="GESBAR Logo" className="size-8 object-contain rounded-full" />
                    </div>
                    <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] hidden xs:block">GESBAR</h2>
                </div>
            </div>

            <div className="flex flex-1 justify-end gap-3 md:gap-8 items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/50" style={{ backgroundImage: profileImage }}></div>
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-red-500/10 hover:text-red-500"
                            title="Sair"
                        >
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </div>

        </header >
    );
};
