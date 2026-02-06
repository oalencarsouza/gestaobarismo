
import React, { useState } from 'react';
import type { HistoricalOrder } from '../../types';
import { OrderStatusBadge } from '../StatusBadge';
import { StatCard } from '../StatCard';

const orders: HistoricalOrder[] = [
    { id: '#9832', time: '19:42', client: 'Mesa 12', total: 145.50, status: 'Pago' },
    { id: '#9831', time: '19:35', client: 'Mesa 05', total: 312.00, status: 'Aberto' },
    { id: '#9830', time: '19:15', client: 'Balcão 02', total: 45.00, status: 'Pago' },
    { id: '#9829', time: '18:55', client: 'Mesa 18', total: 258.90, status: 'Cancelado' },
    { id: '#9828', time: '18:30', client: 'Mesa 04', total: 112.00, status: 'Pago' },
];

export const OrderHistory: React.FC = () => {
    const [selectedOrder, setSelectedOrder] = useState<HistoricalOrder>(orders[1]);

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-white text-3xl font-black tracking-tight">Histórico de Pedidos Diários</h2>
                    <p className="text-gray-400 text-base mt-1">Visualize e detalhe todas as transações realizadas.</p>
                </div>
                <div className="flex gap-4">
                    <StatCard
                        icon="receipt_long"
                        label="Total Pedidos"
                        value="142"
                        change="12%"
                        positive={true}
                    />
                    <StatCard
                        icon="payments"
                        label="Faturamento do Dia"
                        value="R$ 4.250,00"
                        change="5%"
                        positive={false}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                {/* Date Picker Navigation */}
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
                            {orders.map(order => (
                                <tr
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`cursor-pointer transition-colors group ${selectedOrder.id === order.id ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-white/10'}`}
                                >
                                    <td className="px-6 py-4 text-white font-medium">{order.id}</td>
                                    <td className="px-6 py-4 text-gray-400">{order.time}</td>
                                    <td className="px-6 py-4 text-white">{order.client}</td>
                                    <td className="px-6 py-4 text-white font-bold">R$ {order.total.toFixed(2)}</td>
                                    <td className="px-6 py-4"><OrderStatusBadge status={order.status} /></td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`material-symbols-outlined transition-colors ${selectedOrder.id === order.id ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>
                                            visibility
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <aside className="w-full xl:w-[400px] bg-white/5 border border-white/10 rounded-xl p-6 flex-col gap-6 sticky top-8 hidden xl:flex">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">
                            Detalhes do Pedido <span className="text-primary">{selectedOrder.id}</span>
                        </h3>
                        <button className="text-gray-400 hover:text-white">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    {/* Details content */}
                    <div className="mt-auto border-t border-white/10 pt-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center text-2xl font-black text-white py-2 border-y border-white/5">
                            <span>TOTAL</span>
                            <span>R$ {selectedOrder.total.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <button className="flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-4 py-3 rounded-lg font-bold transition-all">
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
            </div>

            {/* Pagination Footer */}
            <div className="flex justify-between items-center mt-auto py-6">
                <p className="text-gray-500 text-sm">Mostrando 1-5 de 142 pedidos</p>
            </div>
        </main>
    );
};
