
import React from 'react';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';
type OrderStatus = 'Pago' | 'Aberto' | 'Cancelado';
type StockStatus = 'OK' | 'Baixo' | 'Sem estoque';

interface StatusBadgeProps {
    status: StatusType | OrderStatus | StockStatus;
    text?: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    // Status types
    success: { bg: 'bg-green-500/20', text: 'text-green-500', label: 'Sucesso' },
    warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'Atenção' },
    error: { bg: 'bg-red-500/20', text: 'text-red-500', label: 'Erro' },
    info: { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'Info' },
    neutral: { bg: 'bg-gray-500/20', text: 'text-gray-500', label: 'Neutro' },
    // Order statuses
    Pago: { bg: 'bg-green-500/20', text: 'text-green-500', label: 'Pago' },
    Aberto: { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'Aberto' },
    Cancelado: { bg: 'bg-red-500/20', text: 'text-red-500', label: 'Cancelado' },
    // Stock statuses
    OK: { bg: 'bg-green-500/20', text: 'text-green-500', label: 'OK' },
    Baixo: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'Baixo' },
    'Sem estoque': { bg: 'bg-red-500/20', text: 'text-red-500', label: 'Sem estoque' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text }) => {
    const config = statusConfig[status] || statusConfig.neutral;
    const displayText = text || config.label;

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
            {displayText}
        </span>
    );
};

// Componente específico para status de pedidos
export const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => (
    <StatusBadge status={status} />
);

// Componente específico para status de estoque
export const StockStatusBadge: React.FC<{ current: number; min: number }> = ({ current, min }) => {
    let status: StockStatus;
    if (current <= 0) {
        status = 'Sem estoque';
    } else if (current < min) {
        status = 'Baixo';
    } else {
        status = 'OK';
    }
    return <StatusBadge status={status} />;
};
