import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StatCard } from '../StatCard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNotification } from '../../contexts/NotificationContext';

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
    rawDate?: Date;
}

interface TopItem {
    name: string;
    category: string;
    quantity: number;
    revenue: number;
}

type Period = 'hoje' | '7d' | '30d' | 'mes' | 'personalizado';

export const Reports: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activePeriod, setActivePeriod] = useState<Period>('30d');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const { showSuccess, showError } = useNotification();

    const [orders, setOrders] = useState<OrderData[]>([]);
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [topItems, setTopItems] = useState<TopItem[]>([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        avgTicket: 0
    });

    const periodLabels: Record<Period, string> = {
        'hoje': 'Hoje',
        '7d': '7 Dias',
        '30d': '30 Dias',
        'mes': 'Este Mês',
        'personalizado': 'Customizado'
    };

    useEffect(() => {
        fetchReportData();
    }, [activePeriod, customRange]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            let start: string;
            let end: string = new Date().toISOString();

            const now = new Date();
            if (activePeriod === 'hoje') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                start = today.toISOString();
            } else if (activePeriod === '7d') {
                const date = new Date();
                date.setDate(date.getDate() - 7);
                start = date.toISOString();
            } else if (activePeriod === '30d') {
                const date = new Date();
                date.setDate(date.getDate() - 30);
                start = date.toISOString();
            } else if (activePeriod === 'mes') {
                const date = new Date(now.getFullYear(), now.getMonth(), 1);
                start = date.toISOString();
            } else {
                start = customRange.start ? new Date(customRange.start).toISOString() : new Date(0).toISOString();
                end = customRange.end ? new Date(customRange.end + 'T23:59:59').toISOString() : new Date().toISOString();
            }

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
                .gte('created_at', start)
                .lte('created_at', end)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            const fetchedOrders = (ordersData || []) as unknown as OrderData[];
            setOrders(fetchedOrders);

            const totalRevenue = fetchedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
            const totalOrders = fetchedOrders.length;
            const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            setStats({ totalRevenue, totalOrders, avgTicket });

            const dailyMap = new Map<string, { count: number, total: number, weekday: string, rawDate: Date }>();

            fetchedOrders.forEach(order => {
                const dateObj = new Date(order.created_at);
                const dateKey = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });

                const current = dailyMap.get(dateKey) || { count: 0, total: 0, weekday, rawDate: dateObj };
                dailyMap.set(dateKey, {
                    count: current.count + 1,
                    total: current.total + Number(order.total || 0),
                    weekday: current.weekday,
                    rawDate: current.rawDate
                });
            });

            const processedDaily: DailyStats[] = Array.from(dailyMap.entries())
                .map(([date, data]) => ({
                    date,
                    weekday: data.weekday,
                    orders: data.count,
                    total: data.total,
                    avgTicket: data.total / data.count,
                    rawDate: data.rawDate
                }))
                .sort((a, b) => b.rawDate!.getTime() - a.rawDate!.getTime());

            setDailyStats(processedDaily);

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
                    category: 'Produto',
                    quantity: data.qty,
                    revenue: data.rev
                }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);

            setTopItems(processedTop);

        } catch (err) {
            console.error('Error fetching report data:', err);
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const primaryColor = [255, 107, 0];

        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('GESTBARISMO', 14, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('Relatório de Gestão Profissional', 14, 26);

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 196, 20, { align: 'right' });
        doc.text(`Período: ${periodLabels[activePeriod]}`, 196, 26, { align: 'right' });

        doc.setLineWidth(0.5);
        doc.line(14, 32, 196, 32);

        // Summary Cards
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(14, 40, 55, 25, 3, 3, 'F');
        doc.roundedRect(77, 40, 55, 25, 3, 3, 'F');
        doc.roundedRect(141, 40, 55, 25, 3, 3, 'F');

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('FATURAMENTO BRUTO', 20, 48);
        doc.text('TOTAL DE PEDIDOS', 83, 48);
        doc.text('TICKET MÉDIO', 147, 48);

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, 58);
        doc.text(`${stats.totalOrders}`, 83, 58);
        doc.text(`R$ ${stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 147, 58);

        // Daily Table
        doc.setFontSize(12);
        doc.text('Detalhamento por Período', 14, 80);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(1);
        doc.line(14, 82, 35, 82);

        autoTable(doc, {
            startY: 88,
            head: [['Data', 'Dia da Semana', 'Pedidos', 'Total Bruto']],
            body: dailyStats.map(row => [
                row.date,
                row.weekday,
                row.orders.toString(),
                `R$ ${row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            ]),
            headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { font: 'helvetica', fontSize: 9 },
            columnStyles: { 3: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'center' } },
            alternateRowStyles: { fillColor: [250, 250, 250] }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;
        const currentY = finalY > 230 ? 20 : finalY;
        if (finalY > 230) doc.addPage();

        doc.setFontSize(12);
        doc.text('Produtos de Maior Giro (Ranking)', 14, currentY);
        doc.line(14, currentY + 2, 35, currentY + 2);

        autoTable(doc, {
            startY: currentY + 8,
            head: [['Posição', 'Produto', 'Quantidade', 'Faturamento']],
            body: topItems.map((item, i) => [
                `${i + 1}º`,
                item.name,
                `${item.quantity} un.`,
                `R$ ${item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            ]),
            headStyles: { fillColor: [30, 30, 30] },
            columnStyles: { 3: { halign: 'right' }, 2: { halign: 'center' }, 0: { halign: 'center' } }
        });

        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('GestBarismo Pro - Inteligência de Bar', 14, 285);
            doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' });
        }

        doc.save(`Relatorio_Vendas_${activePeriod}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
    };

    if (loading && orders.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Gerando Relatórios Brutos...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto overflow-x-hidden min-w-0 bg-background-dark relative">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h2 className="text-white text-3xl font-black tracking-tight flex items-center gap-3 italic uppercase text-shadow-sm">
                        <span className="material-symbols-outlined text-primary text-4xl">analytics</span>
                        Relatórios Financeiros
                    </h2>
                    <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-black opacity-60">
                        Análise de valores brutos e desempenho
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm">
                    {(['hoje', '7d', '30d', 'mes'] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setActivePeriod(p)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activePeriod === p
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {periodLabels[p]}
                        </button>
                    ))}
                    <button
                        onClick={() => setIsCalendarOpen(true)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activePeriod === 'personalizado'
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <span className="material-symbols-outlined text-sm">calendar_month</span>
                        Personalizar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    icon="payments"
                    label="Faturamento Bruto"
                    value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    iconColor="text-green-500"
                    iconBgColor="bg-green-500/10"
                />
                <StatCard
                    icon="receipt_long"
                    label="Total de Pedidos"
                    value={stats.totalOrders}
                    iconColor="text-primary"
                    iconBgColor="bg-primary/10"
                />
                <StatCard
                    icon="confirmation_number"
                    label="Ticket Médio"
                    value={`R$ ${stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    iconColor="text-blue-500"
                    iconBgColor="bg-blue-500/10"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                <div className="xl:col-span-2 flex flex-col gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">list_alt</span>
                                <h3 className="text-white font-black uppercase tracking-tighter italic">Faturamento por Dia</h3>
                            </div>
                            <button
                                onClick={() => setIsPreviewOpen(true)}
                                className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-primary hover:bg-primary/10 flex items-center gap-2 transition-all group"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">Prévia PDF</span>
                                <span className="material-symbols-outlined text-sm transition-transform group-hover:scale-110">picture_as_pdf</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/10">
                                        <th className="px-8 py-5">Data / Dia</th>
                                        <th className="px-8 py-5 text-center">Nº Pedidos</th>
                                        <th className="px-8 py-5 text-right">Valor Bruto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {dailyStats.map((row, i) => (
                                        <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold group-hover:text-primary transition-colors">{row.date}</span>
                                                    <span className="text-gray-500 text-[10px] uppercase font-black tracking-widest opacity-60">{row.weekday}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="px-3 py-1 rounded-lg bg-white/5 text-white font-black font-numbers text-xs">
                                                    {row.orders}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className="text-primary font-black font-numbers text-lg">
                                                    R$ {row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-1 flex flex-col gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-8 shadow-2xl backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                            <span className="material-symbols-outlined text-[12rem] text-primary">workspace_premium</span>
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-white text-xl font-black uppercase tracking-tight flex items-center gap-3 italic">
                                <span className="material-symbols-outlined text-primary text-2xl">workspace_premium</span>
                                Mais Vendidos
                            </h3>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Top Ranking de Saídas</p>
                        </div>

                        <div className="flex flex-col gap-4 relative z-10 pr-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {topItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/20 transition-all group/item">
                                    <div className={`size-12 rounded-xl flex items-center justify-center font-black italic text-lg shadow-inner ${i === 0 ? 'bg-primary text-white shadow-primary/20 scale-110' :
                                        i === 1 ? 'bg-gray-500 text-white' :
                                            i === 2 ? 'bg-amber-700 text-white' : 'bg-white/5 text-gray-500'
                                        }`}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-black text-sm truncate uppercase italic tracking-tight">{item.name}</p>
                                        <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em]">{item.quantity} unidades</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-primary font-black font-numbers text-sm italic">R$ {item.revenue.toFixed(0)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isCalendarOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-background-dark border border-white/10 rounded-[2.5rem] p-10 w-full max-w-sm relative overflow-hidden">
                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Período</h3>
                            <button onClick={() => setIsCalendarOpen(false)} className="text-gray-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Data Inicial</label>
                                <input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({ ...p, start: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-primary/50 outline-none transition-all" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Data Final</label>
                                <input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({ ...p, end: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-primary/50 outline-none transition-all" />
                            </div>

                            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-2">
                                <p className="text-[10px] text-primary font-bold text-center italic">
                                    Limite máximo: 3 meses (90 dias)
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    if (!customRange.start || !customRange.end) {
                                        showError('Por favor, selecione as duas datas.');
                                        return;
                                    }

                                    const d1 = new Date(customRange.start);
                                    const d2 = new Date(customRange.end);
                                    const diffTime = Math.abs(d2.getTime() - d1.getTime());
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                    if (diffDays > 90) {
                                        showError('O período selecionado não pode ser maior que 3 meses (90 dias).');
                                        return;
                                    }

                                    setActivePeriod('personalizado');
                                    setIsCalendarOpen(false);
                                    showSuccess('Filtro de período aplicado!');
                                }}
                                className="w-full bg-primary text-white font-black p-4 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Buscar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isPreviewOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
                    <div className="min-h-full py-10 w-full flex flex-col items-center gap-6">
                        <div className="w-full max-w-[800px] flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 sticky top-0 z-20 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">description</span>
                                <span className="text-white font-black uppercase text-[10px]">Visualização</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsPreviewOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-[10px] font-black uppercase">Fechar</button>
                                <button onClick={generatePDF} className="px-6 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase">Baixar PDF</button>
                            </div>
                        </div>

                        <div className="w-full max-w-[800px] bg-white p-[50px] text-zinc-900 shadow-2xl">
                            <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-8 mb-10">
                                <div>
                                    <h1 className="text-4xl font-black italic text-primary">GESTBARISMO</h1>
                                    <p className="text-zinc-500 font-bold uppercase text-[10px]">Relatórios de Gestão</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
                                    <p className="text-xs text-zinc-400 font-bold">{periodLabels[activePeriod]}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6 mb-12">
                                <div className="bg-zinc-50 p-6 rounded border border-zinc-100">
                                    <p className="text-[8px] font-black uppercase text-zinc-400">Total Bruto</p>
                                    <p className="text-xl font-black">R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-zinc-50 p-6 rounded border border-zinc-100">
                                    <p className="text-[8px] font-black uppercase text-zinc-400">Pedidos</p>
                                    <p className="text-xl font-black">{stats.totalOrders}</p>
                                </div>
                                <div className="bg-zinc-50 p-6 rounded border border-zinc-100">
                                    <p className="text-[8px] font-black uppercase text-zinc-400">Ticket Médio</p>
                                    <p className="text-xl font-black">R$ {stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>

                            <div className="mb-12">
                                <h3 className="text-xs font-black uppercase mb-4 border-l-4 border-primary pl-3">Vendas por Dia</h3>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-zinc-900 text-white font-bold text-left">
                                            <th className="p-2">Data</th>
                                            <th className="p-2 text-center">Pedidos</th>
                                            <th className="p-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200">
                                        {dailyStats.slice(0, 10).map((row, i) => (
                                            <tr key={i}>
                                                <td className="p-2">{row.date}</td>
                                                <td className="p-2 text-center">{row.orders}</td>
                                                <td className="p-2 text-right font-bold">R$ {row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-20 pt-8 border-t border-zinc-200 text-[8px] font-black uppercase flex justify-between">
                                <span>GestBarismo Pro</span>
                                <span>Página 1</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};
