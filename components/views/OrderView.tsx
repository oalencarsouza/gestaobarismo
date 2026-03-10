import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { StatCardCompact } from '../StatCard';
import { NewOrderModal } from '../NewOrderModal';
import { AddOrderItemModal } from '../AddOrderItemModal';
import { ConfirmModal } from '../ConfirmModal';
import { PlusCircle, Search, Loader2, Trash2, ShoppingCart, Plus, X, Coffee, Percent, Copy, Sparkles, ChevronLeft, ChevronRight, Pencil, Check, Printer } from 'lucide-react';
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
    const [activeStatusFilter, setActiveStatusFilter] = useState<OrderStatus | 'all'>('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Edit Total State
    const [isEditingTotal, setIsEditingTotal] = useState(false);
    const [editingTotalValue, setEditingTotalValue] = useState('');


    const fetchOrders = async () => {
        try {
            // Business Session logic: 11:00 AM to 03:00 AM (next day)
            const now = new Date();
            const marginOpen = 11;
            const marginClose = 3;

            const sessionStart = new Date(now);
            sessionStart.setHours(marginOpen, 0, 0, 0);

            if (now.getHours() < marginClose) {
                sessionStart.setDate(sessionStart.getDate() - 1);
            }

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .gte('created_at', sessionStart.toISOString())
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
            setEditingTotalValue(selectedOrder.total.toString());
            setIsEditingTotal(false);
        } else {
            setOrderItems([]);
            setIsEditingTotal(false);
        }
    }, [selectedOrder?.id]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeStatusFilter]);

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
                    // 1. Update order status to Pago
                    const { error: updateError } = await supabase
                        .from('orders')
                        .update({ status: 'Pago', updated_at: new Date().toISOString() })
                        .eq('id', order.id);

                    if (updateError) throw updateError;

                    // 2. Fetch order items with their associated product_ids
                    const { data: items, error: itemsError } = await supabase
                        .from('order_items')
                        .select('*, menu_items(product_id)')
                        .eq('order_id', order.id);

                    if (itemsError) throw itemsError;

                    // 3. Update stock for each item
                    if (items && items.length > 0) {
                        for (const item of items) {
                            const productId = (item as any).menu_items?.product_id;
                            if (!productId) continue;

                            // Calculate subtraction quantity
                            // If menu_type is 'quantidade' (Pague 1 Leve 2), substract 2x
                            const multiplier = item.menu_type === 'quantidade' ? 2 : 1;
                            const qtyToSubtract = item.quantity * multiplier;

                            // Fetch current stock
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

                    // 4. Update local state
                    setOrders(prev => prev.map(o =>
                        o.id === order.id ? { ...o, status: 'Pago' } : o
                    ));
                    if (selectedOrder?.id === order.id) {
                        setSelectedOrder(prev => prev ? { ...prev, status: 'Pago' } : null);
                    }
                    showSuccess('Pedido finalizado e estoque atualizado!');
                } catch (error) {
                    console.error('Erro ao finalizar pedido:', error);
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

    const handleSaveTotal = async () => {
        if (!selectedOrder) return;
        const newTotal = parseFloat(editingTotalValue.replace(',', '.'));

        if (isNaN(newTotal)) {
            showError('Valor inválido.');
            return;
        }

        try {
            const { error } = await supabase
                .from('orders')
                .update({ total: newTotal, updated_at: new Date().toISOString() })
                .eq('id', selectedOrder.id);

            if (error) throw error;

            setOrders(prev => prev.map(o =>
                o.id === selectedOrder.id ? { ...o, total: newTotal } : o
            ));
            setSelectedOrder(prev => prev ? { ...prev, total: newTotal } : null);
            setIsEditingTotal(false);
            showSuccess('Valor total atualizado!');
        } catch (error) {
            showError('Erro ao atualizar valor.');
        }
    };

    const handlePrint = () => {
        if (!selectedOrder) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showError('Houve um erro ao abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativo.');
            return;
        }

        const itemsHtml = orderItems.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 14px; font-weight: 500;">
                <span style="flex: 2;">${item.product_name}</span>
                <span style="flex: 1; text-align: center;">x${item.quantity}</span>
                <span style="flex: 2; text-align: right;">R$ ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <div style="border-bottom: 1px solid #e0e0e0; margin: 4px 0;"></div>
        `).join('');

        const decorativeLine = `
            <div style="text-align: center; margin: 10px 0;">
                <svg width="100%" height="10" viewBox="0 0 300 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 15 0, 30 5 T 60 5 T 90 5 T 120 5 T 150 5 T 180 5 T 210 5 T 240 5 T 270 5 T 300 5" fill="none" stroke="black" stroke-width="1.5"/>
                </svg>
            </div>
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Impressão - GESBAR</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&family=Playfair+Display:ital,wght@1,700&display=swap');
                        body { 
                            font-family: 'Courier New', Courier, monospace; 
                            width: 80mm; 
                            margin: 0 auto; 
                            padding: 10px; 
                            color: #000;
                            background: #fff;
                        }
                        .title { 
                            font-family: 'Oswald', sans-serif; 
                            font-size: 24px; 
                            font-weight: 900; 
                            text-align: center; 
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        .section-title {
                            font-family: 'Oswald', sans-serif;
                            font-size: 22px;
                            font-weight: 900;
                            text-transform: uppercase;
                            margin: 15px 0 5px 0;
                        }
                        .info-row {
                            font-size: 16px;
                            margin-bottom: 5px;
                            display: flex;
                            align-items: center;
                        }
                        .total-row {
                            font-family: 'Oswald', sans-serif;
                            display: flex;
                            justify-content: space-between;
                            font-size: 28px;
                            font-weight: 900;
                            margin-top: 10px;
                            text-transform: uppercase;
                        }
                        .thanks {
                            font-family: 'Playfair Display', serif;
                            font-style: italic;
                            text-align: center;
                            font-size: 18px;
                            margin-top: 25px;
                        }
                        .logo-container {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            margin-bottom: 20px;
                        }
                        @media print {
                            body { width: 100%; margin: 0; padding: 5px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="logo-container">
                         <!-- Simple Black & White representation of the logo structure -->
                         <div style="border: 3px solid black; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; position: relative;">
                            <div style="font-family: 'Oswald', sans-serif; font-weight: 900; font-size: 14px; text-align: center; line-height: 1;">
                                BARISMO<br><span style="font-size: 6px;">DRINNS & PORÇÕES</span>
                            </div>
                         </div>
                    </div>

                    <div class="title">Comprovante de Pedido</div>
                    
                    ${decorativeLine}

                    <div class="info-row"><strong>👤 CLIENTE:</strong>&nbsp; ${selectedOrder.client_name}</div>
                    ${selectedOrder.client_phone ? `<div class="info-row"><strong>📞 TEL:</strong>&nbsp; ${selectedOrder.client_phone}</div>` : ''}
                    <div class="info-row" style="font-size: 10px; color: #666;">ID: #${selectedOrder.id.slice(0, 8).toUpperCase()} | ${new Date(selectedOrder.created_at!).toLocaleTimeString('pt-BR')}</div>

                    ${decorativeLine}

                    <div class="section-title">ITENS:</div>
                    ${itemsHtml}

                    <div class="total-row">
                        <span>TOTAL</span>
                        <span>R$ ${Number(selectedOrder.total).toFixed(2)}</span>
                    </div>

                    <div class="thanks">Obrigado pela preferência!</div>
                    
                    <script>
                        window.onload = () => {
                            window.print();
                            window.onafterprint = () => window.close();
                        };
                    </script>
                </body>
            </html>
        `);

        printWindow.document.close();
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

    // Calculate Daily Cash: Fixed 12:00 - 02:00 business hours with 1h margin
    // Business Session: 11:00 (Today) to 03:00 (Next Day)
    const dailyCashValue = orders
        .filter(o => {
            if (o.status !== 'Pago' || !o.updated_at) return false;

            const updatedDate = new Date(o.updated_at);
            const now = new Date();

            // Default margin: 11:00 AM to 03:00 AM
            const marginOpen = 11;
            const marginClose = 3;

            const sessionStart = new Date(now);
            sessionStart.setHours(marginOpen, 0, 0, 0);

            const sessionEnd = new Date(now);
            sessionEnd.setDate(sessionEnd.getDate() + 1);
            sessionEnd.setHours(marginClose, 0, 0, 0);

            // If current time is between 00:00 and 03:00, we are still in "yesterday's" session
            if (now.getHours() < marginClose) {
                sessionStart.setDate(sessionStart.getDate() - 1);
                sessionEnd.setDate(sessionEnd.getDate() - 1);
            }

            return updatedDate >= sessionStart && updatedDate <= sessionEnd;
        })
        .reduce((sum, o) => sum + Number(o.total), 0);

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = activeStatusFilter === 'all' || o.status === activeStatusFilter;
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalItems = filteredOrders.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background-dark">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto overflow-x-hidden min-w-0 bg-background-dark">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center lg:items-center text-center lg:text-left gap-6">
                <div className="flex flex-col items-center lg:items-start w-full lg:w-auto">
                    <h2 className="text-white text-3xl font-black tracking-tight">Gestão de Pedidos</h2>
                    <p className="text-gray-400 text-sm md:text-base mt-1">Gerencie os pedidos em aberto e novas comandas.</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedOrder(null);
                        setTempCart([]);
                        setIsAddItemModalOpen(true);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-black uppercase italic tracking-wider shadow-xl shadow-primary/20 transition-all active:scale-95"
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
                    onClick={() => setActiveStatusFilter(activeStatusFilter === 'Aberto' ? 'all' : 'Aberto')}
                    isActive={activeStatusFilter === 'Aberto'}
                />
                <StatCardCompact
                    icon="receipt_long"
                    label="Total de Pedidos"
                    value={orders.length}
                    onClick={() => setActiveStatusFilter('all')}
                    isActive={activeStatusFilter === 'all'}
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
                {/* Orders - Cards for Mobile / Table for Desktop */}
                <div className="flex-1 w-full lg:min-w-0">
                    {/* Table View (Desktop) */}
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-xl">
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
                                {paginatedOrders.map(order => (
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
                            </tbody>
                        </table>
                    </div>

                    {/* Card View (Mobile) */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {paginatedOrders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => setSelectedOrder(order)}
                                className={`p-5 rounded-2xl border transition-all active:scale-[0.98] ${selectedOrder?.id === order.id
                                    ? 'bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(255,107,0,0.1)]'
                                    : 'bg-white/5 border-white/10 shadow-lg'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-white font-black uppercase italic tracking-tight">{order.client_name}</h3>
                                        <span className="text-gray-500 text-[10px] uppercase font-black tracking-widest leading-none">
                                            {order.created_at ? new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---'}
                                        </span>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_COLORS[order.status]}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Valor Total</span>
                                        <span className="text-primary font-black text-xl italic tracking-tighter">
                                            R$ {Number(order.total).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="size-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {paginatedOrders.length === 0 && (
                        <div className="p-20 text-center text-gray-500 italic bg-white/5 rounded-2xl border border-white/10">
                            Nenhum pedido encontrado.
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-white/10 flex items-center justify-between text-sm text-gray-400">
                            <span className="hidden sm:inline">
                                Página {currentPage} de {totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-all ${currentPage === page
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
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
                                                        disabled={isEditingTotal}
                                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
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
                                disabled={isEditingTotal}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-white/10 text-gray-400 hover:border-primary/50 hover:text-primary font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={16} />
                                Adicionar Item do Cardápio
                            </button>
                        )}

                        {/* Total and Actions */}
                        <div className="border-t border-white/10 pt-4 flex flex-col gap-3 mt-auto">
                            <div className="flex justify-between items-center py-2">
                                <span className="text-2xl font-black text-white">TOTAL</span>
                                <div className="flex items-center gap-2">
                                    {isEditingTotal ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editingTotalValue}
                                                onChange={(e) => setEditingTotalValue(e.target.value)}
                                                autoFocus
                                                className="w-24 bg-white/10 border border-primary/50 rounded-lg px-2 py-1 text-white text-xl font-numbers font-bold outline-none ring-2 ring-primary/20"
                                            />
                                            <button
                                                onClick={handleSaveTotal}
                                                className="p-1.5 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-all"
                                            >
                                                <Check size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditingTotal(false);
                                                    setEditingTotalValue(selectedOrder.total.toString());
                                                }}
                                                className="p-1.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-all"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-2xl font-black text-white font-numbers">
                                                R$ {Number(selectedOrder.total).toFixed(2)}
                                            </span>
                                            {selectedOrder.status === 'Aberto' && (
                                                <button
                                                    onClick={() => setIsEditingTotal(true)}
                                                    className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-primary transition-all"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handlePrint}
                                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-3 rounded-xl font-bold transition-all text-sm group"
                            >
                                <Printer size={16} className="text-primary group-hover:scale-110 transition-transform" />
                                Imprimir Comprovante
                            </button>

                            {selectedOrder.status === 'Aberto' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleCancelOrder(selectedOrder)}
                                        disabled={isEditingTotal}
                                        className="flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 px-4 py-3 rounded-xl font-bold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <X size={16} />
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleFinalizeOrder(selectedOrder)}
                                        disabled={isEditingTotal}
                                        className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
