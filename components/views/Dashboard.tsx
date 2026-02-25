import React, { useState, useEffect } from 'react';
import { StatCard } from '../StatCard';
import { supabase } from '../../lib/supabase';

interface HighlightData {
    topProduct: { name: string; quantity: number } | null;
    topStockItem: { name: string; consumed: number } | null;
    topClient: { name: string; total: number; orders: number } | null;
    peakHour: string | null;
}

export const Dashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('today');
    const [stats, setStats] = useState({
        revenue: 0,
        orders: 0,
        customers: 0,
        avgTicket: 0
    });
    const [highlights, setHighlights] = useState<HighlightData>({
        topProduct: null,
        topStockItem: null,
        topClient: null,
        peakHour: null
    });

    useEffect(() => {
        fetchDashboardData();
    }, [filter]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            let startDate = new Date();
            if (filter === 'today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (filter === '7days') {
                startDate.setDate(startDate.getDate() - 7);
            } else if (filter === '30days') {
                startDate.setDate(startDate.getDate() - 30);
            } else if (filter === 'month') {
                startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            }

            const isoStartDate = startDate.toISOString();

            // 1. Fetch Orders
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .gte('created_at', isoStartDate)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            // 2. Fetch Order Items (for product ranking)
            const { data: itemsData, error: itemsError } = await supabase
                .from('order_items')
                .select('*')
                .gte('created_at', isoStartDate);

            if (itemsError) throw itemsError;

            // 3. Fetch Stock for consumed items analysis
            const { data: stockData, error: stockError } = await supabase
                .from('stock')
                .select('*, products(name)')
                .order('quantity', { ascending: true });

            if (stockError) throw stockError;

            const orders = ordersData || [];
            const items = itemsData || [];
            const stock = stockData || [];

            // === PROCESS STATS ===
            const paidOrders = orders.filter(o => o.status === 'Pago');
            const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
            const totalOrders = orders.length;
            const uniqueClients = new Set(orders.map(o => o.client_name)).size;
            const avgTicket = paidOrders.length > 0 ? revenue / paidOrders.length : 0;

            setStats({ revenue, orders: totalOrders, customers: uniqueClients, avgTicket });

            // === HIGHLIGHT: PRODUTO MAIS VENDIDO ===
            const productSales = new Map<string, number>();
            items.forEach(item => {
                const current = productSales.get(item.product_name) || 0;
                productSales.set(item.product_name, current + Number(item.quantity || 0));
            });

            let topProduct: HighlightData['topProduct'] = null;
            if (productSales.size > 0) {
                const sorted = Array.from(productSales.entries()).sort((a, b) => b[1] - a[1]);
                topProduct = { name: sorted[0][0], quantity: sorted[0][1] };
            }

            // === HIGHLIGHT: ITEM QUE MAIS SAIU DO ESTOQUE (mais consumido = menor quantidade) ===
            let topStockItem: HighlightData['topStockItem'] = null;
            if (stock.length > 0) {
                // Item com menor estoque (mais consumido)
                const lowest = stock[0]; // já vem ordenado ascending
                const productName = (lowest as any).products?.name || 'Desconhecido';
                topStockItem = { name: productName, consumed: lowest.quantity };
            }

            // === HIGHLIGHT: MELHOR CLIENTE ===
            let topClient: HighlightData['topClient'] = null;
            const clientMap = new Map<string, { total: number; orders: number }>();
            paidOrders.forEach(o => {
                const current = clientMap.get(o.client_name) || { total: 0, orders: 0 };
                clientMap.set(o.client_name, {
                    total: current.total + Number(o.total || 0),
                    orders: current.orders + 1
                });
            });
            if (clientMap.size > 0) {
                const sorted = Array.from(clientMap.entries()).sort((a, b) => b[1].total - a[1].total);
                topClient = { name: sorted[0][0], total: sorted[0][1].total, orders: sorted[0][1].orders };
            }

            // === HIGHLIGHT: HORÁRIO DE PICO ===
            let peakHour: string | null = null;
            const hourMap = new Map<number, number>();
            orders.forEach(o => {
                const hour = new Date(o.created_at).getHours();
                hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
            });
            if (hourMap.size > 0) {
                const sorted = Array.from(hourMap.entries()).sort((a, b) => b[1] - a[1]);
                const h = sorted[0][0];
                peakHour = `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`;
            }

            setHighlights({ topProduct, topStockItem, topClient, peakHour });

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const filterLabel = {
        today: 'Hoje',
        '7days': 'Últimos 7 dias',
        '30days': 'Últimos 30 dias',
        month: 'Este mês',
    }[filter] || 'Hoje';

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto overflow-x-hidden min-w-0 bg-background-dark">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-white text-3xl font-black tracking-tight uppercase italic flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-4xl">dashboard</span>
                        Visão Geral
                    </h2>
                    <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-black opacity-60">Bar Manager Pro // Live Monitor</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-xs font-black uppercase tracking-widest focus:ring-primary focus:border-primary outline-none cursor-pointer hover:bg-white/10 transition-colors"
                    >
                        <option value="today" className="bg-background-dark">Hoje</option>
                        <option value="7days" className="bg-background-dark">Últimos 7 dias</option>
                        <option value="30days" className="bg-background-dark">Últimos 30 dias</option>
                        <option value="month" className="bg-background-dark">Este mês</option>
                    </select>
                    <button
                        onClick={fetchDashboardData}
                        disabled={loading}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
                        {loading ? 'Sincronizando...' : 'Atualizar'}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    icon="payments"
                    label="FATURAMENTO"
                    value={`R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    iconBgColor="bg-primary/20"
                    iconColor="text-primary"
                />
                <StatCard
                    icon="receipt_long"
                    label="PEDIDOS"
                    value={stats.orders}
                    iconBgColor="bg-blue-500/20"
                    iconColor="text-blue-500"
                />
                <StatCard
                    icon="groups"
                    label="CLIENTES"
                    value={stats.customers}
                    iconBgColor="bg-orange-500/20"
                    iconColor="text-orange-500"
                />
                <StatCard
                    icon="local_bar"
                    label="TICKET MÉDIO"
                    value={`R$ ${stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    iconBgColor="bg-green-500/20"
                    iconColor="text-green-500"
                />
            </div>

            {/* Highlights Section */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 bg-white/2 border border-white/5 rounded-3xl border-dashed">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
                    <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Analisando métricas do banco de dados...</p>
                </div>
            ) : (
                <>
                    {/* Destaques Brutos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Produto Mais Vendido */}
                        <div className="relative bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden group hover:border-primary/30 transition-all">
                            <div className="absolute -right-10 -top-10 size-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700"></div>
                            <div className="absolute top-6 right-6 opacity-[0.03]">
                                <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>emoji_events</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary text-2xl">local_fire_department</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Produto campeão</p>
                                        <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">{filterLabel}</p>
                                    </div>
                                </div>
                                {highlights.topProduct ? (
                                    <div>
                                        <p className="text-white text-3xl font-black uppercase italic tracking-tight leading-tight">{highlights.topProduct.name}</p>
                                        <div className="flex items-baseline gap-2 mt-3">
                                            <span className="text-primary text-5xl font-black font-numbers">{highlights.topProduct.quantity}</span>
                                            <span className="text-gray-500 text-xs font-black uppercase tracking-widest">unidades vendidas</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-600 text-sm italic">Sem vendas no período.</p>
                                )}
                            </div>
                        </div>

                        {/* Item Mais Baixo no Estoque */}
                        <div className="relative bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden group hover:border-red-500/30 transition-all">
                            <div className="absolute -right-10 -top-10 size-40 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-colors duration-700"></div>
                            <div className="absolute top-6 right-6 opacity-[0.03]">
                                <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>inventory</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="size-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-red-500 text-2xl">trending_down</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Estoque mais baixo</p>
                                        <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">Atenção necessária</p>
                                    </div>
                                </div>
                                {highlights.topStockItem ? (
                                    <div>
                                        <p className="text-white text-3xl font-black uppercase italic tracking-tight leading-tight">{highlights.topStockItem.name}</p>
                                        <div className="flex items-baseline gap-2 mt-3">
                                            <span className={`text-5xl font-black font-numbers ${highlights.topStockItem.consumed <= 5 ? 'text-red-500' : highlights.topStockItem.consumed <= 15 ? 'text-yellow-500' : 'text-green-500'}`}>{highlights.topStockItem.consumed}</span>
                                            <span className="text-gray-500 text-xs font-black uppercase tracking-widest">unidades restantes</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-600 text-sm italic">Sem dados de estoque.</p>
                                )}
                            </div>
                        </div>

                        {/* Melhor Cliente */}
                        <div className="relative bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden group hover:border-blue-500/30 transition-all">
                            <div className="absolute -right-10 -top-10 size-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-700"></div>
                            <div className="absolute top-6 right-6 opacity-[0.03]">
                                <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>person</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="size-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-blue-500 text-2xl">star</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Cliente do período</p>
                                        <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">{filterLabel}</p>
                                    </div>
                                </div>
                                {highlights.topClient ? (
                                    <div>
                                        <p className="text-white text-3xl font-black uppercase italic tracking-tight leading-tight">{highlights.topClient.name}</p>
                                        <div className="flex items-center gap-6 mt-3">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-blue-500 text-4xl font-black font-numbers">R$ {highlights.topClient.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                                                <span className="material-symbols-outlined text-sm text-gray-400">receipt_long</span>
                                                <span className="text-gray-400 text-xs font-black">{highlights.topClient.orders} pedidos</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-600 text-sm italic">Sem clientes no período.</p>
                                )}
                            </div>
                        </div>

                        {/* Horário de Pico */}
                        <div className="relative bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden group hover:border-orange-500/30 transition-all">
                            <div className="absolute -right-10 -top-10 size-40 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-colors duration-700"></div>
                            <div className="absolute top-6 right-6 opacity-[0.03]">
                                <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>schedule</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="size-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-orange-500 text-2xl">schedule</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Horário de pico</p>
                                        <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">{filterLabel}</p>
                                    </div>
                                </div>
                                {highlights.peakHour ? (
                                    <div>
                                        <p className="text-white text-4xl font-black uppercase italic tracking-tight leading-tight font-numbers">{highlights.peakHour}</p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className="text-gray-500 text-xs font-black uppercase tracking-widest">Maior volume de pedidos</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-600 text-sm italic">Sem dados de horário.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </main>
    );
};
