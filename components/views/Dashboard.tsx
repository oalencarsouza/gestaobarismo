
import React from 'react';
import { StatCard } from '../StatCard';
import type { View } from '../../App';

const RecentOrderRow: React.FC<{
    id: string;
    time: string;
    client: string;
    total: number;
    status: 'Pago' | 'Aberto' | 'Cancelado';
}> = ({ id, time, client, total, status }) => {
    const statusColors = {
        Pago: 'bg-green-500/20 text-green-500',
        Aberto: 'bg-blue-500/20 text-blue-500',
        Cancelado: 'bg-red-500/20 text-red-500',
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-4">
                <span className="text-white font-medium">{id}</span>
                <span className="text-gray-500 text-sm">{time}</span>
            </div>
            <span className="text-gray-400">{client}</span>
            <span className="text-white font-bold">R$ {total.toFixed(2)}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColors[status]}`}>{status}</span>
        </div>
    );
};

const TopProductCard: React.FC<{
    name: string;
    category: string;
    sales: number;
    image?: string;
}> = ({ name, category, sales, image }) => (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
        <div
            className="size-12 rounded-lg bg-cover bg-center bg-white/10"
            style={{ backgroundImage: image ? `url(${image})` : undefined }}
        >
            {!image && <span className="material-symbols-outlined text-gray-500 text-2xl flex items-center justify-center h-full">local_bar</span>}
        </div>
        <div className="flex-1">
            <p className="text-white font-medium">{name}</p>
            <p className="text-gray-500 text-sm">{category}</p>
        </div>
        <div className="text-right">
            <p className="text-primary font-bold">{sales}</p>
            <p className="text-gray-500 text-xs">vendas</p>
        </div>
    </div>
);

export const Dashboard: React.FC<{ setView: (view: View) => void }> = ({ setView }) => {
    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-white text-3xl font-black tracking-tight">Dashboard</h2>
                    <p className="text-gray-400 text-base mt-1">Visão geral do seu estabelecimento</p>
                </div>
                <div className="flex items-center gap-3">
                    <select defaultValue="today" className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:ring-primary focus:border-primary">
                        <option value="today">Hoje</option>
                        <option value="7days">Últimos 7 dias</option>
                        <option value="30days">Últimos 30 dias</option>
                        <option value="month">Este mês</option>
                    </select>
                    <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        <span className="material-symbols-outlined text-lg">refresh</span>
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard icon="payments" label="Faturamento" value="R$ 4.250,00" change="12%" positive={true} />
                <StatCard icon="receipt_long" label="Pedidos" value="142" change="8%" positive={true} />
                <StatCard icon="groups" label="Clientes" value="89" change="5%" positive={true} />
                <StatCard icon="local_bar" label="Ticket Médio" value="R$ 47,75" change="3%" positive={false} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Recent Orders */}
                <div className="xl:col-span-8 bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white text-xl font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">history</span>
                            Pedidos Recentes
                        </h3>
                        <button
                            onClick={() => setView('history')}
                            className="text-primary text-sm font-medium hover:text-primary/80 transition-colors"
                        >
                            Ver todos →
                        </button>
                    </div>
                    <div className="flex flex-col">
                        <RecentOrderRow id="#9832" time="19:42" client="Mesa 12" total={145.50} status="Pago" />
                        <RecentOrderRow id="#9831" time="19:35" client="Mesa 05" total={312.00} status="Aberto" />
                        <RecentOrderRow id="#9830" time="19:15" client="Balcão 02" total={45.00} status="Pago" />
                        <RecentOrderRow id="#9829" time="18:55" client="Mesa 18" total={258.90} status="Cancelado" />
                        <RecentOrderRow id="#9828" time="18:30" client="Mesa 04" total={112.00} status="Pago" />
                    </div>
                </div>

                {/* Top Products */}
                <div className="xl:col-span-4 bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white text-xl font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">trending_up</span>
                            Mais Vendidos
                        </h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        <TopProductCard name="Caipirinha" category="Bebidas" sales={45} />
                        <TopProductCard name="Chopp 500ml" category="Cervejas" sales={38} />
                        <TopProductCard name="Whisky Dose" category="Destilados" sales={32} />
                        <TopProductCard name="Porção Mix" category="Lanches" sales={28} />
                        <TopProductCard name="Gin Tônica" category="Drinks" sales={24} />
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-white text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">bolt</span>
                    Ações Rápidas
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => setView('history')}
                        className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/10 hover:border-primary/30 transition-all group"
                    >
                        <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-primary transition-colors">add_circle</span>
                        <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Novo Pedido</span>
                    </button>
                    <button
                        onClick={() => setView('stock')}
                        className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/10 hover:border-primary/30 transition-all group"
                    >
                        <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-primary transition-colors">inventory_2</span>
                        <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Atualizar Estoque</span>
                    </button>
                    <button
                        onClick={() => setView('menu')}
                        className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/10 hover:border-primary/30 transition-all group"
                    >
                        <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-primary transition-colors">restaurant_menu</span>
                        <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Editar Cardápio</span>
                    </button>
                    <button
                        onClick={() => setView('reports')}
                        className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/10 hover:border-primary/30 transition-all group"
                    >
                        <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-primary transition-colors">bar_chart</span>
                        <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Ver Relatórios</span>
                    </button>
                </div>
            </div>
        </main>
    );
};
