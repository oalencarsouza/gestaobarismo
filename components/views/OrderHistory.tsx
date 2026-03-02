
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { StatCard } from '../StatCard';
import { ConfirmModal } from '../ConfirmModal';
import type { Order, OrderItem } from '../../types';

const STATUS_COLORS: Record<string, string> = {
    'Aberto': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Pago': 'bg-green-500/10 text-green-500 border-green-500/20',
    'Cancelado': 'bg-red-500/10 text-red-500 border-red-500/20'
};

export const OrderHistory: React.FC = () => {
    const { showError, showSuccess } = useNotification();
    const userRole = localStorage.getItem('userRole');
    const isViewer = userRole === 'viewer';
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Estados de Navegação e Filtro
    const [baseDate, setBaseDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => Promise<void> | void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // Lógica de Histórico: BaseDate + 3 anteriores =Janela de 4 dias
    const historicalDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 4; i++) {
            const date = new Date(baseDate);
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days.reverse();
    }, [baseDate]);

    const fetchOrders = async (date: Date) => {
        setLoading(true);
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .gte('created_at', startOfDay.toISOString())
                .lte('created_at', endOfDay.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);

            if (data && data.length > 0) {
                setSelectedOrder(data[0]);
            } else {
                setSelectedOrder(null);
            }
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            showError('Erro ao carregar histórico de pedidos.');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderItems = async (orderId: string) => {
        setItemsLoading(true);
        try {
            const { data, error } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            if (error) throw error;
            setOrderItems(data || []);
        } catch (error) {
            console.error('Erro ao buscar itens do pedido:', error);
        } finally {
            setItemsLoading(false);
        }
    };

    const handleFinalizeOrder = (order: Order) => {
        setConfirmModal({
            isOpen: true,
            title: 'Finalizar Pedido',
            message: `Deseja marcar o pedido de "${order.client_name}" como Pago? Isso atualizará o estoque.`,
            onConfirm: async () => {
                try {
                    const { error: updateError } = await supabase
                        .from('orders')
                        .update({ status: 'Pago', updated_at: new Date().toISOString() })
                        .eq('id', order.id);

                    if (updateError) throw updateError;

                    const { data: items, error: itemsError } = await supabase
                        .from('order_items')
                        .select('*, menu_items(product_id)')
                        .eq('order_id', order.id);

                    if (!itemsError && items && items.length > 0) {
                        for (const item of items) {
                            const productId = (item as any).menu_items?.product_id;
                            if (!productId) continue;

                            const multiplier = item.menu_type === 'quantidade' ? 2 : 1;
                            const qtyToSubtract = item.quantity * multiplier;

                            const { data: stockData } = await supabase
                                .from('stock')
                                .select('quantity')
                                .eq('product_id', productId)
                                .single();

                            if (stockData) {
                                const newQty = Math.max(0, stockData.quantity - qtyToSubtract);
                                await supabase
                                    .from('stock')
                                    .update({ quantity: newQty })
                                    .eq('product_id', productId);
                            }
                        }
                    }

                    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Pago' } : o));
                    if (selectedOrder?.id === order.id) {
                        setSelectedOrder(prev => prev ? { ...prev, status: 'Pago' } : null);
                    }
                    showSuccess('Pedido finalizado e estoque atualizado!');
                } catch (error) {
                    console.error('Erro ao finalizar:', error);
                    showError('Erro ao finalizar pedido.');
                }
            }
        });
    };

    const handleApplyDate = () => {
        if (!dateInput) return;

        // Split YYYY-MM-DD and create local date to avoid timezone offsets
        const [year, month, day] = dateInput.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);
        newDate.setHours(12, 0, 0, 0);

        setBaseDate(newDate);
        setSelectedDate(newDate);
        setIsCalendarOpen(false);
    };

    const handleResetToToday = () => {
        const today = new Date();
        setBaseDate(today);
        setSelectedDate(today);
    };

    useEffect(() => {
        fetchOrders(selectedDate);
        setCurrentPage(1);
    }, [selectedDate]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    useEffect(() => {
        if (selectedOrder) {
            fetchOrderItems(selectedOrder.id);
        } else {
            setOrderItems([]);
        }
    }, [selectedOrder?.id]);

    const filteredOrders = useMemo(() => {
        const filtered = orders.filter(o =>
            o.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return filtered;
    }, [orders, searchTerm]);

    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredOrders, currentPage]);

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

    const dailyRevenue = useMemo(() => {
        return orders
            .filter(o => o.status === 'Pago')
            .reduce((sum, o) => sum + Number(o.total), 0);
    }, [orders]);

    const isViewingPast = baseDate.toDateString() !== new Date().toDateString();

    if (loading && orders.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
                    <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Carregando histórico...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="flex-1 flex flex-col p-4 md:p-6 gap-6 overflow-y-auto overflow-x-hidden min-w-0 bg-background-dark relative">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-white text-3xl font-black tracking-tight flex items-center gap-3 italic uppercase text-shadow-sm">
                        <span className="material-symbols-outlined text-primary text-4xl">history</span>
                        Histórico de Pedidos
                    </h2>
                    <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-black opacity-60">
                        {isViewingPast
                            ? `Exibindo período encerrado em ${baseDate.toLocaleDateString('pt-BR')}`
                            : 'Detalhamento dos últimos 4 dias'}
                    </p>
                </div>
                <div className="flex gap-4">
                    <StatCard
                        icon="receipt_long"
                        label="PEDIDOS"
                        value={orders.length}
                    />
                    {!isViewer && (
                        <StatCard
                            icon="payments"
                            label="FATURAMENTO"
                            value={`R$ ${dailyRevenue.toFixed(2)}`}
                            iconColor="text-green-500"
                            iconBgColor="bg-green-500/10"
                        />
                    )}
                </div>
            </div>

            {/* Date Bar Row */}
            <div className="flex flex-col gap-6 bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-9xl">analytics</span>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsCalendarOpen(true)}
                            className="size-12 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                        >
                            <span className="material-symbols-outlined">calendar_month</span>
                        </button>
                        <div className="flex flex-col">
                            <span className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Ponto de Partida:</span>
                            <span className="text-white font-black uppercase tracking-tighter text-sm italic">
                                {baseDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                        {historicalDays.map((date, idx) => {
                            const isSelected = selectedDate.toDateString() === date.toDateString();
                            const isToday = date.toDateString() === new Date().toDateString();
                            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
                            const dateNum = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(date)}
                                    className={`px-4 py-2.5 rounded-2xl font-black transition-all flex flex-col items-center gap-0.5 min-w-[100px] border relative ${isSelected
                                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105 z-10'
                                        : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10 hover:text-white hover:border-white/20'
                                        }`}
                                >
                                    {isToday && (
                                        <span className="absolute -top-2 -right-2 bg-primary text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-lg">Hoje</span>
                                    )}
                                    <span className={`text-[8px] uppercase font-black tracking-tighter ${isSelected ? 'text-white/80' : 'text-primary'}`}>
                                        {dayName.split('-')[0]}
                                    </span>
                                    <span className="text-sm">{dateNum}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-3 flex-1 max-w-sm w-full">
                        {isViewingPast && (
                            <button
                                onClick={handleResetToToday}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined text-sm text-primary">today</span>
                                Hoje
                            </button>
                        )}
                        <div className="flex-1 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 focus-within:border-primary transition-all shadow-inner group">
                            <span className="material-symbols-outlined text-gray-500 text-lg group-focus-within:text-primary transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-600 flex-1 outline-none text-[10px] font-black uppercase tracking-widest"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-4 items-start relative">
                {/* Orders Table */}
                <div className="flex-1 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
                    <div className="overflow-x-auto scrollbar-hide">
                        <style>{`
                            .scrollbar-hide::-webkit-scrollbar { display: none; }
                            .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                        `}</style>
                        <table className="w-full text-left border-collapse table-auto">
                            <thead>
                                <tr className="bg-white/5 text-gray-400 text-[10px] font-black border-b border-white/10 uppercase tracking-[0.2em]">
                                    <th className="px-2 py-5">Horário</th>
                                    <th className="px-2 py-4">Cliente</th>
                                    <th className="px-2 py-4">Valor Total</th>
                                    <th className="px-2 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {paginatedOrders.map(order => (
                                    <tr
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order)}
                                        className={`cursor-pointer transition-all group ${selectedOrder?.id === order.id ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-white/[0.03]'}`}
                                    >
                                        <td className="px-2 py-5">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <span className="material-symbols-outlined text-sm opacity-50">schedule</span>
                                                <span className="text-xs font-medium">
                                                    {new Date(order.created_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold whitespace-nowrap">{order.client_name}</span>
                                                <span className="text-gray-500 text-[10px] font-medium tracking-wider">{order.id.slice(0, 8).toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-4">
                                            <span className="text-white font-black font-numbers text-lg whitespace-nowrap">
                                                R$ {Number(order.total).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-2 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-20">
                                                <span className="material-symbols-outlined text-5xl">shopping_bag</span>
                                                <p className="text-white font-bold uppercase tracking-[0.2em] text-sm">Nenhum pedido neste dia</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar Details */}
                {selectedOrder && (
                    <aside className="w-full xl:w-[350px] bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6 sticky top-8 transition-all h-fit animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">
                                    Detalhes do Pedido <span className="text-primary ml-2">#{selectedOrder.id.slice(0, 5).toUpperCase()}</span>
                                </h3>
                                <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    Iniciado às {new Date(selectedOrder.created_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="p-2 rounded-xl bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Cliente</span>
                                <span className="text-white font-bold">{selectedOrder.client_name}</span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-2">
                                    <span className="material-symbols-outlined text-primary text-sm">shopping_bag</span>
                                    <span className="text-white text-xs font-black uppercase tracking-[0.2em]">Itens Consumidos</span>
                                </div>

                                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {itemsLoading ? (
                                        <div className="py-8 flex justify-center">
                                            <span className="material-symbols-outlined text-primary animate-spin text-2xl opacity-50">refresh</span>
                                        </div>
                                    ) : orderItems.length === 0 ? (
                                        <p className="text-gray-600 text-center py-4 text-xs italic">Sem itens registrados.</p>
                                    ) : (
                                        orderItems.map(item => (
                                            <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-sm">{item.product_name}</span>
                                                    <span className="text-gray-500 text-[10px]">x{item.quantity} un.</span>
                                                </div>
                                                <span className="text-primary font-black font-numbers text-sm">
                                                    R$ {(item.price * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-white/10 space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-2xl font-black text-white tracking-widest uppercase">Total</span>
                                <span className="text-3xl font-black text-primary font-numbers">
                                    R$ {Number(selectedOrder.total).toFixed(2)}
                                </span>
                            </div>

                            {!isViewer && (
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => selectedOrder.status === 'Aberto' && handleFinalizeOrder(selectedOrder)}
                                        className={`col-span-2 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 group ${selectedOrder.status === 'Pago'
                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20 cursor-default'
                                            : selectedOrder.status === 'Cancelado'
                                                ? 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-default'
                                                : 'bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20'
                                            }`}
                                    >
                                        {selectedOrder.status === 'Pago' ? (
                                            <>
                                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                                Finalizado
                                            </>
                                        ) : selectedOrder.status === 'Cancelado' ? (
                                            <>
                                                <span className="material-symbols-outlined text-lg">cancel</span>
                                                Cancelado
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-lg">payments</span>
                                                Finalizar
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>

            {/* Footer with Pagination */}
            <div className="flex flex-col md:flex-row justify-between items-center mt-auto py-6 border-t border-white/10 gap-4">
                <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">
                    Mostrando {paginatedOrders.length} de {filteredOrders.length} pedidos • Página {currentPage} de {totalPages || 1}
                </p>

                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`size-10 rounded-xl border border-white/10 flex items-center justify-center transition-all ${currentPage === 1 ? 'opacity-20 cursor-not-allowed' : 'bg-white/5 text-white hover:bg-white/10 hover:border-primary/50'}`}
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`size-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={`size-10 rounded-xl border border-white/10 flex items-center justify-center transition-all ${currentPage === totalPages ? 'opacity-20 cursor-not-allowed' : 'bg-white/5 text-white hover:bg-white/10 hover:border-primary/50'}`}
                        >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="toast"
            />

            {/* Pivot Calendar Modal */}
            {isCalendarOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div
                        className="bg-background-dark border border-white/10 rounded-[2.5rem] p-10 w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 relative overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute -top-24 -right-24 size-48 bg-primary/10 blur-[80px] rounded-full" />

                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3 italic">
                                    <span className="material-symbols-outlined text-primary text-3xl">calendar_month</span>
                                    Filtro
                                </h3>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Escolha a data final</p>
                            </div>
                            <button
                                onClick={() => setIsCalendarOpen(false)}
                                className="size-10 rounded-2xl bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="space-y-8 relative z-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 block italic">
                                    Esta data + 3 dias anteriores serão exibidos
                                </label>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        value={dateInput}
                                        onChange={(e) => setDateInput(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-black text-sm uppercase group-hover:border-white/20"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={handleApplyDate}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-2xl shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                                >
                                    <span className="material-symbols-outlined transition-transform group-hover:scale-110">search_check</span>
                                    Aplicar Filtro
                                </button>

                                <button
                                    onClick={() => setIsCalendarOpen(false)}
                                    className="w-full text-gray-600 hover:text-gray-400 font-black uppercase tracking-widest text-[9px] py-4 mt-2 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};
