import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { StatCardCompact } from '../StatCard';
import { NewOrderModal } from '../NewOrderModal';
import { AddOrderItemModal } from '../AddOrderItemModal';
import { ConfirmModal } from '../ConfirmModal';
import { PlusCircle, Search, Loader2, Trash2, ShoppingCart, Plus, X, Coffee, Percent, Copy, Sparkles } from 'lucide-react';
import type { Order, OrderItem, OrderStatus, MenuType, CartItem } from '../../types';

const STATUS_COLORS: Record<string, string> = {
    'Aberto': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Pago': 'bg-green-500/10 text-green-500 border-green-500/20',
    'Cancelado': 'bg-red-500/10 text-red-500 border-red-500/20'
};

const ORDER_TYPE_BADGES: Record<string, { badge: string; color: string; icon: React.ReactNode }> = {
    'promotion': { badge: 'Em dobro!', color: 'border-purple-500 text-purple-400 bg-purple-500/10', icon: <Sparkles size={10} /> },
    'discount': { badge: 'Com desconto!', color: 'border-orange-500 text-orange-400 bg-orange-500/10', icon: <Percent size={10} /> },
};

interface OrderViewProps {
    triggerNewOrder?: boolean;
    onNewOrderTriggered?: () => void;
}

export const OrderView: React.FC<OrderViewProps> = ({
    triggerNewOrder,
    onNewOrderTriggered
}) => {
    const { showSuccess, showError } = useNotification();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

    // Initialize confirmModal correctly
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        isDestructive: boolean;
        onConfirm: () => Promise<void> | void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        isDestructive: false,
        onConfirm: () => { }
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [tempCart, setTempCart] = useState<CartItem[]>([]);

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            showError('Erro ao carregar pedidos.');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderItems = async (orderId: string) => {
        try {
            const { data, error } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            if (error) throw error;
            setOrderItems(data || []);
        } catch (error) {
            console.error('Erro ao buscar itens do pedido:', error);
            showError('Erro ao carregar itens.');
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        if (selectedOrder) {
            fetchOrderItems(selectedOrder.id);
        } else {
            setOrderItems([]);
        }
    }, [selectedOrder?.id]);

    useEffect(() => {
        if (triggerNewOrder) {
            setSelectedOrder(null);
            setTempCart([]);
            setIsAddItemModalOpen(true);
            if (onNewOrderTriggered) onNewOrderTriggered();
        }
    }, [triggerNewOrder]);

    const handleCreateOrder = async (clientName: string, clientPhone: string) => {
        try {
            // 1. Create Order
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    client_name: clientName,
                    client_phone: clientPhone,
                    total: 0 // Will be updated
                }])
                .select();

            if (orderError) throw orderError;
            if (!orderData || orderData.length === 0) throw new Error('Erro ao criar pedido');

            const newOrder = orderData[0];

            // 2. Insert Items if any
            if (tempCart.length > 0) {
                const items = tempCart.map(c => ({
                    order_id: newOrder.id,
                    menu_id: c.menuId,
                    menu_item_id: c.menuItemId,
                    product_name: c.productName,
                    price: c.price,
                    quantity: c.quantity,
                    menu_type: c.menuType,
                    menu_name: c.menuName,
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(items);

                if (itemsError) throw itemsError;

                // 3. Update Order Total
                const total = tempCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ total: total })
                    .eq('id', newOrder.id);

                if (updateError) throw updateError;
            }

            showSuccess('Pedido criado com sucesso!');
            await fetchOrders();

            // Fetch the full updated order (with correct total)
            const { data: updatedOrderData } = await supabase
                .from('orders')
                .select('*')
                .eq('id', newOrder.id)
                .single();

            if (updatedOrderData) {
                setSelectedOrder(updatedOrderData);
            } else {
                setSelectedOrder(newOrder);
            }

            setTempCart([]); // Clear temp cart

        } catch (error) {
            console.error('Erro ao criar pedido:', error);
            showError('Erro ao criar o pedido.');
        }
    };

    const handleDeleteItem = (item: OrderItem) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remover Item',
            message: `Remover "${item.product_name}" do pedido?`,
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('order_items')
                        .delete()
                        .eq('id', item.id);

                    if (error) throw error;

                    // Recalculate total
                    const remaining = orderItems.filter(i => i.id !== item.id);
                    const newTotal = remaining.reduce((sum, i) => sum + i.price * i.quantity, 0);

                    await supabase
                        .from('orders')
                        .update({ total: newTotal, updated_at: new Date().toISOString() })
                        .eq('id', item.order_id);

                    setOrderItems(remaining);
                    setOrders(prev => prev.map(o =>
                        o.id === item.order_id ? { ...o, total: newTotal } : o
                    ));
                    if (selectedOrder?.id === item.order_id) {
                        setSelectedOrder(prev => prev ? { ...prev, total: newTotal } : null);
                    }
                    showSuccess('Item removido!');
                } catch (error) {
                    showError('Erro ao remover item.');
                }
            }
        });
    };

    const handleFinalizeOrder = (order: Order) => {
        setConfirmModal({
            isOpen: true,
            title: 'Finalizar Pedido',
            message: `Finalizar o pedido de "${order.client_name}"? Total: R$ ${order.total.toFixed(2)}`,
            isDestructive: false,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('orders')
                        .update({ status: 'Pago', updated_at: new Date().toISOString() })
                        .eq('id', order.id);

                    if (error) throw error;

                    setOrders(prev => prev.map(o =>
                        o.id === order.id ? { ...o, status: 'Pago' } : o
                    ));
                    if (selectedOrder?.id === order.id) {
                        setSelectedOrder(prev => prev ? { ...prev, status: 'Pago' } : null);
                    }
                    showSuccess('Pedido finalizado!');
                } catch (error) {
                    showError('Erro ao finalizar pedido.');
                }
            }
        });
    };

    const handleCancelOrder = (order: Order) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancelar Pedido',
            message: `Tem certeza que deseja cancelar o pedido de "${order.client_name}"?`,
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('orders')
                        .update({ status: 'Cancelado', updated_at: new Date().toISOString() })
                        .eq('id', order.id);

                    if (error) throw error;

                    setOrders(prev => prev.map(o =>
                        o.id === order.id ? { ...o, status: 'Cancelado' } : o
                    ));
                    if (selectedOrder?.id === order.id) {
                        setSelectedOrder(prev => prev ? { ...prev, status: 'Cancelado' } : null);
                    }
                    showSuccess('Pedido cancelado.');
                } catch (error) {
                    showError('Erro ao cancelar pedido.');
                }
            }
        });
    };

    const handleItemsAdded = async () => {
        if (selectedOrder) {
            fetchOrderItems(selectedOrder.id);

            // Fetch updated orders to get new total
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setOrders(data);
                // Update selected order with new data (containing new total)
                const updatedOrder = data.find(o => o.id === selectedOrder.id);
                if (updatedOrder) {
                    setSelectedOrder(updatedOrder);
                }
            }
        }
    };

    const activeOrders = orders.filter(o => o.status === 'Aberto');

    // Calculate Daily Cash: Total of 'Pago' orders within business hours (18h-00h) 
    // with a 1h margin (17h - 01h next day).
    const dailyCashValue = orders
        .filter(o => {
            if (o.status !== 'Pago' || !o.updated_at) return false;

            const updatedDate = new Date(o.updated_at);
            const now = new Date();

            // Define business session: 17:00 of the CURRENT day to 01:00 of the NEXT day
            const sessionStart = new Date(now);
            sessionStart.setHours(17, 0, 0, 0);

            const sessionEnd = new Date(now);
            sessionEnd.setDate(sessionEnd.getDate() + 1);
            sessionEnd.setHours(1, 0, 0, 0);

            // If it's currently early morning (before 01:00), we are still in "yesterday's" session
            if (now.getHours() < 1) {
                sessionStart.setDate(sessionStart.getDate() - 1);
                sessionEnd.setDate(sessionEnd.getDate() - 1);
            }

            return updatedDate >= sessionStart && updatedDate <= sessionEnd;
        })
        .reduce((sum, o) => sum + Number(o.total), 0);

    const filteredOrders = orders.filter(o =>
        o.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background-dark">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto bg-background-dark">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-white text-3xl font-black tracking-tight">Gestão de Pedidos</h2>
                    <p className="text-gray-400 text-base mt-1">Gerencie os pedidos em aberto e novas comandas.</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedOrder(null);
                        setTempCart([]);
                        setIsAddItemModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all"
                >
                    <PlusCircle size={20} />
                    Novo Pedido
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCardCompact
                    icon="shopping_basket"
                    label="Pedidos Ativos"
                    value={activeOrders.length}
                />
                <StatCardCompact
                    icon="receipt_long"
                    label="Total de Pedidos"
                    value={orders.length}
                />
                <StatCardCompact
                    icon="payments"
                    label="Caixa Diário"
                    value={`R$ ${dailyCashValue.toFixed(2)}`}
                    iconBgColor="bg-green-500/10"
                    iconColor="text-green-500"
                />
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus-within:border-primary/50 transition-colors">
                    <Search className="text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-500 flex-1 outline-none py-1"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-col xl:flex-row gap-6 items-start">
                {/* Orders Table */}
                <div className="flex-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-xs font-bold border-b border-white/10 uppercase tracking-wider">
                                <th className="px-6 py-5">Cliente</th>
                                <th className="px-6 py-5">Horário</th>
                                <th className="px-6 py-5">Valor Total</th>
                                <th className="px-6 py-5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-sm">
                            {filteredOrders.map(order => (
                                <tr
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`cursor-pointer transition-colors group ${selectedOrder?.id === order.id
                                        ? 'bg-primary/5 border-l-4 border-l-primary'
                                        : 'hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold">{order.client_name}</span>
                                            <span className="text-gray-500 text-xs">{order.client_phone || order.id.slice(0, 8)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        {order.created_at
                                            ? new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                            : '—'
                                        }
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-primary font-black font-numbers text-lg">
                                            R$ {Number(order.total).toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[order.status]}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredOrders.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-gray-500 italic">
                                        Nenhum pedido encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Order Details Sidebar */}
                {selectedOrder && (
                    <aside className="w-full xl:w-[420px] bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-5 sticky top-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {selectedOrder.client_name}
                                </h3>
                                {selectedOrder.client_phone && (
                                    <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-1">
                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>phone</span>
                                        {selectedOrder.client_phone}
                                    </p>
                                )}
                                <p className="text-gray-500 text-xs mt-0.5">{selectedOrder.id.slice(0, 8)}</p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[selectedOrder.status]}`}>
                                {selectedOrder.status}
                            </span>
                            <span className="text-gray-500 text-xs">
                                {selectedOrder.created_at
                                    ? new Date(selectedOrder.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                    : ''
                                }
                            </span>
                        </div>

                        {/* Items List */}
                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {orderItems.length === 0 ? (
                                <div className="py-8 text-center text-gray-500 italic text-sm">
                                    Nenhum item adicionado.
                                </div>
                            ) : (
                                orderItems.map(item => {
                                    const typeBadge = item.menu_type ? ORDER_TYPE_BADGES[item.menu_type] : null;
                                    return (
                                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
                                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-medium text-sm truncate">{item.product_name}</span>
                                                    {item.quantity > 1 && (
                                                        <span className="text-gray-500 text-xs font-bold">x{item.quantity}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {typeBadge && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeBadge.color}`}>
                                                            {typeBadge.icon}
                                                            {typeBadge.badge}
                                                        </span>
                                                    )}
                                                    {item.menu_name && !typeBadge && (
                                                        <span className="text-gray-500 text-[10px]">{item.menu_name}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-primary font-bold font-numbers text-sm">
                                                    R$ {(item.price * item.quantity).toFixed(2)}
                                                </span>
                                                {selectedOrder.status === 'Aberto' && (
                                                    <button
                                                        onClick={() => handleDeleteItem(item)}
                                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Add Item Button */}
                        {selectedOrder.status === 'Aberto' && (
                            <button
                                onClick={() => setIsAddItemModalOpen(true)}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-white/10 text-gray-400 hover:border-primary/50 hover:text-primary font-bold text-sm transition-all"
                            >
                                <Plus size={16} />
                                Adicionar Item do Cardápio
                            </button>
                        )}

                        {/* Total and Actions */}
                        <div className="border-t border-white/10 pt-4 flex flex-col gap-3 mt-auto">
                            <div className="flex justify-between items-center text-2xl font-black text-white py-2">
                                <span>TOTAL</span>
                                <span className="font-numbers">R$ {Number(selectedOrder.total).toFixed(2)}</span>
                            </div>

                            {selectedOrder.status === 'Aberto' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleCancelOrder(selectedOrder)}
                                        className="flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 px-4 py-3 rounded-xl font-bold transition-all text-sm"
                                    >
                                        <X size={16} />
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleFinalizeOrder(selectedOrder)}
                                        className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all text-sm"
                                    >
                                        <span className="material-symbols-outlined text-sm">payments</span>
                                        Finalizar
                                    </button>
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>

            <NewOrderModal
                isOpen={isNewOrderModalOpen}
                onClose={() => setIsNewOrderModalOpen(false)}
                onSave={handleCreateOrder}
            />

            <AddOrderItemModal
                isOpen={isAddItemModalOpen}
                onClose={() => setIsAddItemModalOpen(false)}
                onItemsAdded={handleItemsAdded}
                onCartConfirmed={(items) => {
                    setTempCart(items);
                    setIsNewOrderModalOpen(true);
                }}
                orderId={selectedOrder && !isNewOrderModalOpen && tempCart.length === 0 ? selectedOrder.id : undefined}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                variant="toast"
            />
        </main>
    );
};
