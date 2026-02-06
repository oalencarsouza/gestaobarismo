
import React, { useState } from 'react';
import { StatCard } from '../StatCard';

interface ReportData {
    date: string;
    weekday: string;
    orders: number;
    avgTicket: number;
    total: number;
    status: 'Fechado' | 'Aberto';
}

interface TopItem {
    name: string;
    category: string;
    quantity: number;
    revenue: number;
    image?: string;
}

const reportData: ReportData[] = [
    { date: '07 Nov 2023', weekday: 'Terça-Feira', orders: 42, avgTicket: 88.40, total: 3712.80, status: 'Fechado' },
    { date: '06 Nov 2023', weekday: 'Segunda-Feira', orders: 28, avgTicket: 72.10, total: 2018.80, status: 'Fechado' },
    { date: '05 Nov 2023', weekday: 'Domingo', orders: 65, avgTicket: 104.20, total: 6773.00, status: 'Fechado' },
    { date: '04 Nov 2023', weekday: 'Sábado', orders: 89, avgTicket: 112.00, total: 9968.00, status: 'Fechado' },
    { date: '03 Nov 2023', weekday: 'Sexta-Feira', orders: 74, avgTicket: 95.50, total: 7067.00, status: 'Fechado' },
];

const topItems: TopItem[] = [
    { name: 'Moscow Mule', category: 'Drinks Artesanais', quantity: 142, revenue: 4544.00 },
    { name: 'IPA Craft Beer', category: 'Cervejas especiais', quantity: 98, revenue: 2744.00 },
    { name: 'Batata Rústica', category: 'Petiscos', quantity: 76, revenue: 1420.00 },
];

const categoryFilters = ['Todos', 'Bebidas', 'Destilados', 'Cervejas', 'Lanches', 'Insumos'];

const ReportTypeTabs = ['Faturamento Diário', 'Vendas por Item', 'Desempenho de Garçons', 'Estoque Consumido'];

export const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Faturamento Diário');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [dateRange, setDateRange] = useState({ start: '06 Out 2023', end: '07 Nov 2023' });

    const totalRevenue = reportData.reduce((sum, d) => sum + d.total, 0);
    const totalOrders = reportData.reduce((sum, d) => sum + d.orders, 0);
    const avgTicket = totalRevenue / totalOrders;

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-6 overflow-y-auto">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <p className="text-primary text-sm font-bold uppercase tracking-wider mb-1">
                        <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">analytics</span>
                            Módulo de Análise
                        </span>
                    </p>
                    <h1 className="text-white text-4xl font-black tracking-tight">Relatórios Detalhados</h1>
                    <p className="text-gray-400 text-base mt-1">Análise financeira detalhada do seu estabelecimento.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-medium transition-all border border-white/10">
                        <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                        Exportar PDF
                    </button>
                    <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-primary/20 transition-all">
                        <span className="material-symbols-outlined text-lg">download</span>
                        Exportar Excel
                    </button>
                </div>
            </div>

            {/* Report Type Tabs with Sidebar Style */}
            <div className="flex gap-6">
                {/* Sidebar Navigation */}
                <div className="hidden lg:flex flex-col w-64 gap-2 shrink-0">
                    <p className="text-gray-500 text-xs uppercase tracking-wider px-3 mb-2">Relatórios</p>
                    {ReportTypeTabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${activeTab === tab
                                ? 'bg-primary text-white'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">
                                {tab === 'Faturamento Diário' ? 'payments' :
                                    tab === 'Vendas por Item' ? 'receipt_long' :
                                        tab === 'Desempenho de Garçons' ? 'groups' : 'inventory_2'}
                            </span>
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Date Filter Alert */}
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <span className="material-symbols-outlined text-primary">info</span>
                        <p className="text-gray-300 text-sm">
                            <span className="font-bold text-primary">Restrição de Período:</span> O intervalo máximo para consulta é de 90 dias (3 meses) para garantir a performance dos dados.
                        </p>
                    </div>

                    {/* Date Range Picker */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                            <div className="flex gap-8">
                                {/* Month 1 */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <button className="text-gray-400 hover:text-white">
                                            <span className="material-symbols-outlined">chevron_left</span>
                                        </button>
                                        <span className="text-white font-bold">OUTUBRO 2023</span>
                                        <div className="w-6"></div>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                            <span key={i} className="text-gray-500 py-1">{d}</span>
                                        ))}
                                        {[29, 30, 31, 1, 2, 3, null, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((d, i) => (
                                            <button
                                                key={i}
                                                className={`py-2 rounded-lg text-sm transition-all ${d === 6 ? 'bg-primary text-white' :
                                                    (d !== null && d >= 1 && d <= 14 && d !== 6) ? 'bg-primary/20 text-primary' :
                                                        d !== null ? 'text-gray-400 hover:bg-white/10' : ''
                                                    }`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Month 2 */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="w-6"></div>
                                        <span className="text-white font-bold">NOVEMBRO 2023</span>
                                        <button className="text-gray-400 hover:text-white">
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                            <span key={i} className="text-gray-500 py-1">{d}</span>
                                        ))}
                                        {[null, null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d, i) => (
                                            <button
                                                key={i}
                                                className={`py-2 rounded-lg text-sm transition-all ${d === 7 ? 'bg-primary text-white' :
                                                        (d !== null && d >= 1 && d <= 7 && d !== 7) ? 'bg-primary/20 text-primary' :
                                                            d !== null ? 'text-gray-400 hover:bg-white/10' : ''
                                                    }`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Selected Period */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="text-center">
                                    <p className="text-gray-500 text-xs uppercase tracking-wider">Período Selecionado</p>
                                    <p className="text-white font-bold">{dateRange.start} — {dateRange.end}</p>
                                    <p className="text-primary text-sm font-medium">Total: 33 dias</p>
                                </div>
                                <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all">
                                    <span className="material-symbols-outlined">filter_alt</span>
                                    Aplicar Filtro
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Category Filters */}
                    <div className="flex flex-wrap gap-2">
                        <span className="text-gray-400 text-sm font-medium py-2">Filtrar por categoria:</span>
                        {categoryFilters.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat
                                    ? 'bg-primary text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Faturamento Total</p>
                                    <p className="text-white text-4xl font-black">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    <p className="text-green-500 text-sm mt-1">+15.3%</p>
                                </div>
                                <div className="p-3 rounded-lg bg-primary/10">
                                    <span className="material-symbols-outlined text-primary text-2xl">trending_up</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Ticket Médio</p>
                                    <p className="text-white text-4xl font-black">R$ {avgTicket.toFixed(2)}</p>
                                    <p className="text-green-500 text-sm mt-1">+3.2%</p>
                                </div>
                                <div className="p-3 rounded-lg bg-blue-500/10">
                                    <span className="material-symbols-outlined text-blue-500 text-2xl">receipt_long</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Total de Pedidos</p>
                                    <p className="text-white text-4xl font-black">{totalOrders}</p>
                                    <p className="text-red-500 text-sm mt-1">-4.8%</p>
                                </div>
                                <div className="p-3 rounded-lg bg-green-500/10">
                                    <span className="material-symbols-outlined text-green-500 text-2xl">shopping_cart</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">table_chart</span>
                                <h3 className="text-white font-bold">Detalhamento de Faturamento Diário</h3>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
                                <input
                                    type="text"
                                    placeholder="Buscar data..."
                                    className="bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-500 text-sm w-32"
                                />
                            </div>
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5 text-gray-400 text-xs font-medium uppercase tracking-wider">
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Total Pedidos</th>
                                    <th className="px-6 py-4">Ticket Médio</th>
                                    <th className="px-6 py-4">Total Bruto</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {reportData.map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium">{row.date}</span>
                                                <span className="text-gray-500 text-xs">{row.weekday}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-white font-medium">{row.orders}</td>
                                        <td className="px-6 py-4 text-white">R$ {row.avgTicket.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-primary font-bold">R$ {row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500">
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex justify-between items-center p-4 border-t border-white/10">
                            <p className="text-gray-500 text-sm">Mostrando 5 de 33 dias</p>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 rounded-lg bg-white/5 text-gray-400">{'<'}</button>
                                <button className="px-3 py-1 rounded-lg bg-primary text-white">1</button>
                                <button className="px-3 py-1 rounded-lg bg-white/5 text-gray-400">2</button>
                                <button className="px-3 py-1 rounded-lg bg-white/5 text-gray-400">3</button>
                                <button className="px-3 py-1 rounded-lg bg-white/5 text-gray-400">{'>'}</button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section: Chart + Top Items */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Trend Chart Placeholder */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-white font-bold">Tendência de Faturamento</h3>
                                <span className="text-primary text-sm font-medium px-3 py-1 bg-primary/10 rounded-lg">SEMANAL</span>
                            </div>
                            <div className="h-48 flex items-end justify-around gap-4 px-4">
                                {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map((day, i) => (
                                    <div key={day} className="flex flex-col items-center gap-2">
                                        <div
                                            className="w-10 bg-primary/60 hover:bg-primary rounded-t-lg transition-colors"
                                            style={{ height: `${[60, 80, 45, 90, 100, 120, 70][i]}px` }}
                                        ></div>
                                        <span className="text-gray-500 text-xs">{day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Items */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h3 className="text-white font-bold mb-4">Top Itens Mais Vendidos</h3>
                            <div className="flex flex-col gap-4">
                                {topItems.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                        <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary">local_bar</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-medium">{item.name}</p>
                                            <p className="text-gray-500 text-sm">{item.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-bold">{item.quantity} un.</p>
                                            <p className="text-primary text-sm font-medium">R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full mt-4 text-primary text-sm font-medium hover:text-primary/80 transition-colors">
                                Ver relatório completo de itens →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};
