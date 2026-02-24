
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { OrderStatusBadge } from '../StatusBadge';
import { StatCard } from '../StatCard';
import { ConfirmModal } from '../ConfirmModal';
import { Loader2, Search, X, Printer, Calendar, Clock, ShoppingBag, CheckCircle2, History } from 'lucide-react';
import type { Order, OrderItem } from '../../types';

const STATUS_COLORS: Record<string, string> = {
    'Aberto': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Pago': 'bg-green-500/10 text-green-500 border-green-500/20',
    'Cancelado': 'bg-red-500/10 text-red-500 border-red-500/20'
};

export const OrderHistory: React.FC = () => {
    const { showError, showSuccess } = useNotification();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
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

    // History Logic: Last 3 days before today
    const historicalDays = useMemo(() => {
        const days = [];
        for (let i = 1; i <= 3; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days.reverse(); // Saturday, Sunday, Monday (if today is Tuesday)
    }, []);

    const [selectedDate, setSelectedDate] = useState<Date>(historicalDays[2]); // Default to yesterday

    const fetchOrders = async (date: Date) => {
        setLoading(true);
        try {
            // Set range for the whole selected day
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

            // Auto-select first order if exists
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
                    // 1. Update order status
                    const { error: updateError } = await supabase
                        .from('orders')
                        .update({ status: 'Pago', updated_at: new Date().toISOString() })
                        .eq('id', order.id);

                    if (updateError) throw updateError;

                    // 2. Update stock (copying logic from OrderView)
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

                    // 3. Update local state
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



    useEffect(() => {
        fetchOrders(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        if (selectedOrder) {
            fetchOrderItems(selectedOrder.id);
        } else {
            setOrderItems([]);
        }
    }, [selectedOrder?.id]);

    const filteredOrders = useMemo(() => {
        return orders.filter(o =>
            o.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [orders, searchTerm]);

    const dailyRevenue = useMemo(() => {
        return orders
            .filter(o => o.status === 'Pago')
            .reduce((sum, o) => sum + Number(o.total), 0);
    }, [orders]);

    if (loading && orders.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background-dark">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto overflow-x-hidden min-w-0 bg-background-dark">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-white text-3xl font-black tracking-tight flex items-center gap-3">
                        <History className="text-primary" size={32} />
                        Histórico de Pedidos Diários
                    </h2>
                    <p className="text-gray-400 text-base mt-1">Visualize e detalhe transações dos últimos 3 dias.</p>
                </div>
                <div className="flex gap-4">
                    <StatCard
                        icon="receipt_long"
                        label="Total Pedidos"
                        value={orders.length}
                    />
                    <StatCard
                        icon="payments"
                        label="Faturamento do Dia"
                        value={`R$ ${dailyRevenue.toFixed(2)}`}
                        iconColor="text-green-500"
                        iconBgColor="bg-green-500/10"
                    />
                </div>
            </div>

            {/* Date Picker Navigation */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg">
                <div className="flex items-center gap-3">
                    <Calendar className="text-primary" size={20} />
                    <span className="text-gray-300 font-bold uppercase tracking-wider text-sm">Período Disponível:</span>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                    {historicalDays.map((date, idx) => {
                        const isSelected = selectedDate.toDateString() === date.toDateString();
                        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
                        const dateNum = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(date)}
                                className={`px-6 py-3 rounded-xl font-bold transition-all flex flex-col items-center gap-0.5 min-w-[140px] border ${isSelected
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105'
                                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/10'
                                    }`}
                            >
                                <span className={`text-[10px] uppercase font-black tracking-tighter ${isSelected ? 'text-white/80' : 'text-primary'}`}>
                                    {dayName.split('-')[0]}
                                </span>
                                <span className="text-base">
                                    {dateNum}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 max-w-xs w-full">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-primary/50 transition-all shadow-inner">
                        <Search className="text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar no dia..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-600 flex-1 outline-none text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 items-start relative">
                {/* Orders Table */}
                <div className="flex-1 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-gray-400 text-[10px] font-black border-b border-white/10 uppercase tracking-[0.2em]">
                                    <th className="px-6 py-5">Horário</th>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Valor Total</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {filteredOrders.map(order => (
                                    <tr
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order)}
                                        className={`cursor-pointer transition-all group ${selectedOrder?.id === order.id ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-white/[0.03]'}`}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Clock size={14} className="opacity-50" />
                                                <span className="text-xs font-medium">
                                                    {new Date(order.created_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{order.client_name}</span>
                                                <span className="text-gray-500 text-[10px] font-medium tracking-wider">{order.id.slice(0, 8).toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-white font-black font-numbers text-lg">
                                                R$ {Number(order.total).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`p-2 rounded-lg inline-flex transition-colors ${selectedOrder?.id === order.id ? 'bg-primary text-white' : 'bg-white/5 text-gray-500 group-hover:text-primary group-hover:bg-primary/10'}`}>
                                                <span className="material-symbols-outlined text-base">visibility</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-20">
                                                <ShoppingBag size={48} />
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
                    <aside className="w-full xl:w-[450px] bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-6 sticky top-8 transition-all h-fit animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">
                                    Detalhes do Pedido <span className="text-primary ml-2">#{selectedOrder.id.slice(0, 5).toUpperCase()}</span>
                                </h3>
                                <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                                    <Clock size={14} />
                                    Iniciado às {new Date(selectedOrder.created_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="p-2 rounded-xl bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Cliente</span>
                                <span className="text-white font-bold">{selectedOrder.client_name}</span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-2">
                                    <ShoppingBag size={14} className="text-primary" />
                                    <span className="text-white text-xs font-black uppercase tracking-[0.2em]">Itens Consumidos</span>
                                </div>

                                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {itemsLoading ? (
                                        <div className="py-8 flex justify-center">
                                            <Loader2 className="animate-spin text-primary opacity-50" size={24} />
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

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => selectedOrder.status !== 'Pago' && handleFinalizeOrder(selectedOrder)}
                                    className={`col-span-2 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 group ${selectedOrder.status === 'Pago'
                                        ? 'bg-green-500/10 text-green-500 border border-green-500/20 cursor-default'
                                        : 'bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20'
                                        }`}
                                >
                                    {selectedOrder.status === 'Pago' ? (
                                        <>
                                            <CheckCircle2 size={18} />
                                            Finalizado
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">payments</span>
                                            Finalizar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* Pagination/Status Footer */}
            <div className="flex justify-between items-center mt-auto py-6 border-t border-white/10">
                <p className="text-gray-600 text-xs font-bold uppercase tracking-[0.2em]">
                    Mostrando {filteredOrders.length} de {orders.length} pedidos em {selectedDate.toLocaleDateString('pt-BR')}
                </p>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="toast"
            />
        </main>
    );
};
