import React, { useState } from 'react';
import type { HistoricalOrder } from '../../types';
import { OrderStatusBadge } from '../StatusBadge';
import { StatCard } from '../StatCard';

// Using the same type for simplicity in this logic, but filtered for active ones
const activeOrders: HistoricalOrder[] = [
    { id: '#9831', time: '19:35', client: 'Mesa 05', total: 312.00, status: 'Aberto' },
    { id: '#9825', time: '18:15', client: 'Mesa 02', total: 85.00, status: 'Aberto' },
    { id: '#9820', time: '17:45', client: 'Balcão 01', total: 22.50, status: 'Aberto' },
];

export const OrderView: React.FC = () => {
    const [selectedOrder, setSelectedOrder] = useState<HistoricalOrder | null>(activeOrders[0]);

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-white text-3xl font-black tracking-tight">Gestão de Pedidos</h2>
                    <p className="text-gray-400 text-base mt-1">Gerencie os pedidos em aberto e novas comandas.</p>
                </div>
                <div className="flex gap-4">
                    <StatCard
                        icon="shopping_basket"
                        label="Pedidos Ativos"
                        value={activeOrders.length.toString()}
                        change="+3"
                        positive={true}
                    />
                    <StatCard
                        icon="grid_view"
                        label="Mesas Ocupadas"
                        value="8 / 20"
                        change="40%"
                        positive={true}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex gap-3">
                    <button className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-sm">add</span>
                        Novo Pedido
                    </button>
                    <button className="bg-white/5 text-white border border-white/10 px-6 py-2.5 rounded-lg font-medium hover:bg-white/10 transition-all">
                        Mesas
                    </button>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">filter_list</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-start">
                <div className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-sm font-medium border-b border-white/10">
                                <th className="px-6 py-4">ID do Pedido</th>
                                <th className="px-6 py-4">Horário</th>
                                <th className="px-6 py-4">Mesa/Cliente</th>
                                <th className="px-6 py-4">Valor Total</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-sm">
                            {activeOrders.map(order => (
                                <tr
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`cursor-pointer transition-colors group ${selectedOrder?.id === order.id ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-white/10'}`}
                                >
                                    <td className="px-6 py-4 text-white font-medium">{order.id}</td>
                                    <td className="px-6 py-4 text-gray-400">{order.time}</td>
                                    <td className="px-6 py-4 text-white">{order.client}</td>
                                    <td className="px-6 py-4 text-white font-bold">R$ {order.total.toFixed(2)}</td>
                                    <td className="px-6 py-4"><OrderStatusBadge status={order.status} /></td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`material-symbols-outlined transition-colors ${selectedOrder?.id === order.id ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>
                                            edit
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {selectedOrder && (
                    <aside className="w-full xl:w-[400px] bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-6 sticky top-8">
                        <div className="flex justify-between items-center text-white">
                            <h3 className="text-xl font-bold">
                                Detalhes do Pedido <span className="text-primary">{selectedOrder.id}</span>
                            </h3>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 text-gray-400">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span>Cliente/Local</span>
                                <span className="text-white font-medium">{selectedOrder.client}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span>Abertura</span>
                                <span className="text-white font-medium">{selectedOrder.time}</span>
                            </div>
                        </div>

                        <div className="mt-auto border-t border-white/10 pt-6 flex flex-col gap-4">
                            <div className="flex justify-between items-center text-3xl font-black text-white py-2">
                                <span>TOTAL</span>
                                <span>R$ {selectedOrder.total.toFixed(2)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-3 rounded-lg font-bold transition-all">
                                    <span className="material-symbols-outlined text-sm">print</span>
                                    Imprimir
                                </button>
                                <button className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all">
                                    <span className="material-symbols-outlined text-sm">payments</span>
                                    Finalizar
                                </button>
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </main>
    );
};
