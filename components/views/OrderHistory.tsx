
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { StatCard } from '../StatCard';
import { ConfirmModal } from '../ConfirmModal';
import type { Order, OrderItem } from '../../types';
import { getBusinessDayRange, isWithinOperatingHours } from '../../lib/data-utils';

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
    const [topProduct, setTopProduct] = useState<{ name: string, quantity: number } | null>(null);

    // Estados de Navegação e Filtro
    const [baseDate, setBaseDate] = useState<Date>(() => {
        const now = new Date();
        if (now.getHours() < 5) now.setDate(now.getDate() - 1);
        return now;
    });
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const now = new Date();
        if (now.getHours() < 5) now.setDate(now.getDate() - 1);
        return now;
    });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
    const [observation, setObservation] = useState('');
    const [isSavingObservation, setIsSavingObservation] = useState(false);
    const [businessHours, setBusinessHours] = useState<any[]>([]);

    useEffect(() => {
        const savedHours = localStorage.getItem('businessHours');
        if (savedHours) {
            try {
                setBusinessHours(JSON.parse(savedHours));
            } catch (e) {
                console.error("Failed to load hours", e);
            }
        }
    }, []);

    const highlights = useMemo(() => {
        const productSales = new Map<string, number>();
        const clientMap = new Map<string, number>();

        orders.filter(o => o.status === 'Pago').forEach(o => {
            clientMap.set(o.client_name, (clientMap.get(o.client_name) || 0) + Number(o.total || 0));
        });

        // We need order items to get top product, but here we only have orders in the main list.
        // Actually, we load order_items only when selected.
        // To make a real highlight we would need to fetch all items of the day.
        // For now, let's use a placeholder or the same client logic.

        const sortedClients = Array.from(clientMap.entries()).sort((a, b) => b[1] - a[1]);

        return {
            topClient: sortedClients.length > 0 ? { name: sortedClients[0][0] } : null,
            topProduct: topProduct
        };
    }, [orders, topProduct]);

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
            const { start: startOfDay, end: endOfDay } = getBusinessDayRange(date);

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

                // Fetch Top Product for Highlights
                const { data: itemsData } = await supabase
                    .from('order_items')
                    .select('product_name, quantity')
                    .gte('created_at', startOfDay.toISOString())
                    .lte('created_at', endOfDay.toISOString());

                if (itemsData) {
                    const sales = new Map<string, number>();
                    itemsData.forEach(item => {
                        sales.set(item.product_name, (sales.get(item.product_name) || 0) + item.quantity);
                    });
                    const sorted = Array.from(sales.entries()).sort((a, b) => b[1] - a[1]);
                    if (sorted.length > 0) {
                        setTopProduct({ name: sorted[0][0], quantity: sorted[0][1] });
                    } else {
                        setTopProduct(null);
                    }
                }
            } else {
                setSelectedOrder(null);
                setTopProduct(null);
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
            console.error('Erro ao buscar itens:', error);
        } finally {
            setItemsLoading(false);
        }
    };

    const handleSaveObservation = async () => {
        if (!selectedOrder) return;
        setIsSavingObservation(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ observation, updated_at: new Date().toISOString() })
                .eq('id', selectedOrder.id);

            if (error) throw error;

            setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, observation } : o));
            setSelectedOrder(prev => prev ? { ...prev, observation } : null);
            showSuccess('Comentário salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar comentário:', error);
            showError('Erro ao salvar comentário.');
        } finally {
            setIsSavingObservation(false);
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
        if (today.getHours() < 5) today.setDate(today.getDate() - 1);
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
            setObservation(selectedOrder.observation || '');
        } else {
            setOrderItems([]);
            setObservation('');
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
                {!isViewer && (
                    <div className="flex gap-4">
                        <StatCard
                            icon="receipt_long"
                            label="PEDIDOS"
                            value={orders.length}
                        />
                        <StatCard
                            icon="payments"
                            label="FATURAMENTO"
                            value={`R$ ${dailyRevenue.toFixed(2)}`}
                            iconColor="text-green-500"
                            iconBgColor="bg-green-500/10"
                        />
                    </div>
                )}
            </div>

            {/* Viewer Highlights */}
            {isViewer && (
                <div className="flex flex-col gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex items-center gap-6 shadow-2xl backdrop-blur-md">
                        <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-5xl">receipt_long</span>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">Pedidos</p>
                            <p className="text-white text-7xl font-black font-numbers leading-none">{orders.length}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Cliente que mais gastou (Dia)</p>
                                <p className="text-white text-xl font-black uppercase italic">{highlights.topClient?.name || '---'}</p>
                            </div>
                            <span className="material-symbols-outlined text-primary text-3xl opacity-50">star</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Item que mais saiu (Dia)</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-white text-xl font-black uppercase italic">{highlights.topProduct?.name || '---'}</p>
                                    {highlights.topProduct && (
                                        <span className="text-primary font-black text-sm">{highlights.topProduct.quantity}x</span>
                                    )}
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-primary text-3xl opacity-50">local_fire_department</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Date Bar Row */}
            <div className="flex flex-col gap-6 bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md relative overflow-hidden">

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        {!isViewer && (
                            <button
                                onClick={() => setIsCalendarOpen(true)}
                                className="size-12 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center transition-all"
                            >
                                <span className="material-symbols-outlined">calendar_month</span>
                            </button>
                        )}
                        <div className="flex flex-col">
                            <span className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Ponto de Partida:</span>
                            <span className="text-white font-black uppercase tracking-tighter text-sm italic">
                                {isViewer ? 'Período Fixo (4 dias)' : baseDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 w-full sm:w-auto">
                        {historicalDays.map((date, idx) => {
                            const isSelected = selectedDate.toDateString() === date.toDateString();
                            const isToday = date.toDateString() === new Date().toDateString();
                            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
                            const dateNum = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(date)}
                                    className={`px-4 py-2.5 rounded-2xl font-black transition-all flex flex-col items-center gap-0.5 min-w-[100px] w-full sm:w-auto border relative ${isSelected
                                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 z-10'
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
                        {!isViewer && isViewingPast && (
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
                {/* Desktop Table View */}
                <div className="hidden lg:block flex-1 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
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
                                    <th className="px-2 py-4 text-center">Obs</th>
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
                                        <td className="px-2 py-4 text-center">
                                            {!isWithinOperatingHours(order.created_at!, businessHours) && (
                                                <div className="group relative inline-block">
                                                    <span className="material-symbols-outlined text-amber-500 text-lg animate-pulse">warning</span>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-32 p-2 bg-background-dark border border-amber-500/30 rounded-lg text-[8px] font-black text-amber-500 uppercase tracking-widest text-center shadow-2xl z-50">
                                                        Fora do Horário
                                                    </div>
                                                </div>
                                            )}
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

                {/* Mobile Cards View */}
                <div className="lg:hidden flex flex-col gap-3 w-full">
                    {paginatedOrders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`p-4 rounded-2xl border transition-all active:scale-[0.98] ${selectedOrder?.id === order.id
                                ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5'
                                : 'bg-white/5 border-white/10'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-xl bg-white/5 ${selectedOrder?.id === order.id ? 'text-primary' : 'text-gray-500'}`}>
                                        <span className="material-symbols-outlined text-sm">schedule</span>
                                    </div>
                                    <span className="text-xs font-black text-gray-400">
                                        {new Date(order.created_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${STATUS_COLORS[order.status] || ''}`}>
                                    {order.status}
                                </span>
                            </div>
                            {!isWithinOperatingHours(order.created_at!, businessHours) && (
                                <div className="mb-3 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-500 text-sm">warning</span>
                                    <span className="text-amber-500 text-[8px] font-black uppercase tracking-widest">Pedido fora do horário de funcionamento</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                    <span className="text-white font-black uppercase italic text-sm tracking-tight leading-none">{order.client_name}</span>
                                    <span className="text-gray-600 text-[9px] font-black tracking-widest mt-1">ID: #{order.id.slice(0, 8).toUpperCase()}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-primary font-black font-numbers text-xl uppercase italic">
                                        R$ {Number(order.total).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredOrders.length === 0 && (
                        <div className="p-12 text-center opacity-20">
                            <span className="material-symbols-outlined text-5xl mb-2">shopping_bag</span>
                            <p className="text-white font-black uppercase tracking-[0.2em] text-xs">Nenhum pedido</p>
                        </div>
                    )}
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
                                <div className="flex flex-col gap-4">
                                    {(selectedOrder.status === 'Aberto' || selectedOrder.status === 'Cancelado') ? (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2 px-2">
                                                <span className="material-symbols-outlined text-primary text-sm">comment</span>
                                                <span className="text-white text-xs font-black uppercase tracking-[0.2em]">Comentário / Motivo</span>
                                            </div>
                                            <textarea
                                                value={observation}
                                                onChange={(e) => setObservation(e.target.value)}
                                                placeholder="Digite o motivo ou observação..."
                                                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-primary/50 transition-colors resize-none"
                                            />
                                            <button
                                                onClick={handleSaveObservation}
                                                disabled={isSavingObservation}
                                                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {isSavingObservation ? (
                                                    <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-sm">save</span>
                                                )}
                                                Salvar Comentário
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-3">
                                            <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                            <span className="text-green-500 font-black uppercase tracking-widest text-[10px]">Pedido Pago</span>
                                        </div>
                                    )}

                                    {selectedOrder.observation && selectedOrder.status === 'Pago' && (
                                        <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                            <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Observação Final</span>
                                            <p className="text-gray-400 text-xs italic">"{selectedOrder.observation}"</p>
                                        </div>
                                    )}
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
