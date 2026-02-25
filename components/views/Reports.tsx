import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface OrderItemData {
    product_name: string;
    price: number;
    quantity: number;
}

interface OrderData {
    id: string;
    created_at: string;
    total: number;
    status: string;
    order_items?: OrderItemData[];
}

interface DailyStats {
    date: string;
    weekday: string;
    orders: number;
    total: number;
    avgTicket: number;
}

interface TopItem {
    name: string;
    category: string;
    quantity: number;
    revenue: number;
}

export const Reports: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [topItems, setTopItems] = useState<TopItem[]>([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        avgTicket: 0
    });

    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchReportData();
    }, [dateRange]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select(`
                    id,
                    created_at,
                    total,
                    status,
                    order_items (
                        product_name,
                        price,
                        quantity
                    )
                `)
                .eq('status', 'Pago')
                .gte('created_at', `${dateRange.start}T00:00:00Z`)
                .lte('created_at', `${dateRange.end}T23:59:59Z`)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            const fetchedOrders = (ordersData || []) as unknown as OrderData[];
            setOrders(fetchedOrders);

            const totalRevenue = fetchedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
            const totalOrders = fetchedOrders.length;
            const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            setStats({ totalRevenue, totalOrders, avgTicket });

            const dailyMap = new Map<string, { count: number, total: number, weekday: string }>();

            fetchedOrders.forEach(order => {
                const dateObj = new Date(order.created_at);
                const dateKey = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
                const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });

                const current = dailyMap.get(dateKey) || { count: 0, total: 0, weekday };
                dailyMap.set(dateKey, {
                    count: current.count + 1,
                    total: current.total + Number(order.total || 0),
                    weekday: current.weekday
                });
            });

            const processedDaily: DailyStats[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
                date,
                weekday: data.weekday,
                orders: data.count,
                total: data.total,
                avgTicket: data.total / data.count
            }));

            setDailyStats(processedDaily.sort((a, b) => b.date.localeCompare(a.date)));

            const itemsMap = new Map<string, { qty: number, rev: number }>();
            fetchedOrders.forEach(order => {
                order.order_items?.forEach(item => {
                    const current = itemsMap.get(item.product_name) || { qty: 0, rev: 0 };
                    itemsMap.set(item.product_name, {
                        qty: current.qty + (item.quantity || 0),
                        rev: current.rev + ((item.price || 0) * (item.quantity || 0))
                    });
                });
            });

            const processedTop: TopItem[] = Array.from(itemsMap.entries())
                .map(([name, data]) => ({
                    name,
                    category: 'Geral',
                    quantity: data.qty,
                    revenue: data.rev
                }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);

            setTopItems(processedTop);

        } catch (err) {
            console.error('Error fetching report data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
                    <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Gerando relatórios reais...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-6 overflow-y-auto overflow-x-hidden min-w-0 bg-background-dark">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-white text-4xl font-black tracking-tight">Relatórios Financeiros</h1>
                    <p className="text-gray-400 text-base mt-1">Dados reais de vendas e faturamento.</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest font-bold">Faturamento Total</p>
                            <p className="text-white text-3xl font-black">R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-primary/10">
                            <span className="material-symbols-outlined text-primary">trending_up</span>
                        </div>
                    </div>
                </div>
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest font-bold">Ticket Médio</p>
                            <p className="text-white text-3xl font-black">R$ {stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-500/10">
                            <span className="material-symbols-outlined text-blue-500">receipt_long</span>
                        </div>
                    </div>
                </div>
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest font-bold">Total de Pedidos</p>
                            <p className="text-white text-3xl font-black">{stats.totalOrders}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-500/10">
                            <span className="material-symbols-outlined text-green-500">shopping_cart</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                <div className="flex items-center gap-2 p-4 border-b border-white/10 bg-white/5">
                    <span className="material-symbols-outlined text-primary">table_chart</span>
                    <h3 className="text-white font-bold uppercase tracking-wider text-sm">Faturamento por Período</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4 text-center">Pedidos</th>
                                <th className="px-6 py-4">Ticket Médio</th>
                                <th className="px-6 py-4 text-right">Total Bruto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {dailyStats.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                                        Nenhum dado encontrado para o período selecionado.
                                    </td>
                                </tr>
                            ) : (
                                dailyStats.map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-primary">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{row.date}</span>
                                                <span className="text-gray-500 text-xs capitalize">{row.weekday}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-white/10 px-3 py-1 rounded-full text-white font-bold text-xs">
                                                {row.orders}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-300 font-mono">R$ {row.avgTicket.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right text-primary font-black font-mono">R$ {row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Top Items Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">local_bar</span>
                        ITENS MAIS VENDIDOS
                    </h3>
                    <div className="flex flex-col gap-3">
                        {topItems.length === 0 ? (
                            <p className="text-gray-500 text-sm italic py-8 text-center">Sem itens vendidos no período.</p>
                        ) : (
                            topItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all">
                                    <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
                                        {i + 1}º
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-bold">{item.name}</p>
                                        <p className="text-gray-500 text-xs uppercase font-bold tracking-tighter">Categoria: {item.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-black">{item.quantity} un.</p>
                                        <p className="text-primary text-xs font-bold font-mono">R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-4 border-dashed opacity-60">
                    <div className="p-4 rounded-full bg-white/5">
                        <span className="material-symbols-outlined text-gray-500 text-4xl">insights</span>
                    </div>
                    <div>
                        <p className="text-white font-bold uppercase tracking-widest text-xs">Indicadores de Crescimento</p>
                        <p className="text-gray-500 text-sm mt-2 max-w-xs">
                            Gráficos de tendência e comparativos de período serão ativados automaticamente assim que houver histórico de vendas superior a 7 dias.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
};
