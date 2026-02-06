
import React from 'react';

interface StatCardProps {
    icon: string;
    label: string;
    value: string | number;
    change?: string;
    positive?: boolean;
    iconBgColor?: string;
    iconColor?: string;
    onClick?: () => void;
    isActive?: boolean;
}


export const StatCard: React.FC<StatCardProps> = ({
    icon,
    label,
    value,
    change,
    positive = true,
    iconBgColor = 'bg-primary/10',
    iconColor = 'text-primary',
    onClick,
    isActive
}) => (
    <div
        onClick={onClick}
        className={`flex flex-col gap-2 rounded-xl p-6 bg-white/5 border transition-all ${isActive ? 'border-primary ring-1 ring-primary/50' : 'border-white/10 hover:border-primary/30'
            } ${onClick ? 'cursor-pointer hover:bg-white/10' : ''}`}
    >
        <div className="flex items-center gap-3">
            <div className={`size-12 rounded-lg ${iconBgColor} flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${iconColor} text-2xl`}>{icon}</span>
            </div>
            <div>
                <p className="text-gray-400 text-sm font-medium">{label}</p>
                <div className="flex items-end gap-2">
                    <p className="text-white text-2xl font-bold font-numbers">{value}</p>
                    {change && (
                        <p className={`text-sm font-medium mb-0.5 ${positive ? 'text-green-500' : 'text-red-500'}`}>
                            {positive ? '+' : ''}{change}
                        </p>
                    )}
                </div>
            </div>
        </div>
    </div>
);

// Variante compacta para uso em listas
export const StatCardCompact: React.FC<StatCardProps> = ({
    icon,
    label,
    value,
    iconBgColor = 'bg-primary/10',
    iconColor = 'text-primary',
    onClick,
    isActive
}) => (
    <div
        onClick={onClick}
        className={`flex items-center gap-4 p-4 rounded-xl bg-white/5 border transition-all ${isActive ? 'border-primary ring-1 ring-primary/50' : 'border-white/10 hover:border-primary/30'
            } ${onClick ? 'cursor-pointer hover:bg-white/10' : ''}`}
    >
        <div className={`size-12 rounded-lg ${iconBgColor} flex items-center justify-center`}>
            <span className={`material-symbols-outlined ${iconColor} text-2xl`}>{icon}</span>
        </div>
        <div>
            <p className="text-gray-400 text-sm">{label}</p>
            <p className="text-white text-2xl font-bold">{value}</p>
        </div>
    </div>
);
