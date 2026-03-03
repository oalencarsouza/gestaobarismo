import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { CheckCircle, XCircle } from 'lucide-react';

export const LatestOrderStatus: React.FC = () => {
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useNotification();

    const fetchLatest = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (error) throw error;
            setOrder(data);
        } catch (err) {
            console.error('Erro ao buscar último pedido', err);
            showError('Não foi possível obter o último pedido.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLatest();
    }, []);

    const finalize = async () => {
        if (!order) return;
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'Pago', updated_at: new Date().toISOString() })
                .eq('id', order.id);
            if (error) throw error;
            showSuccess('Pedido finalizado!');
            // Refresh order
            fetchLatest();
        } catch (err) {
            console.error('Erro ao finalizar pedido', err);
            showError('Falha ao finalizar o pedido.');
        }
    };

    if (loading) {
        return <div className="text-gray-400">Carregando último pedido...</div>;
    }

    if (!order) {
        return <div className="text-gray-400">Nenhum pedido encontrado.</div>;
    }

    return (
        <div className="p-4 bg-[#1a1614] border border-white/10 rounded-xl mb-4">
            <h3 className="text-white font-bold mb-2">Último Pedido</h3>
            <p className="text-gray-300">ID: {order.id}</p>
            <p className="text-gray-300">Cliente: {order.client_name}</p>
            <p className="text-gray-300">Status: {order.status}</p>
            {order.status !== 'Pago' && (
                <button
                    onClick={finalize}
                    className="mt-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
                >
                    Finalizar Pedido
                </button>
            )}
            {order.status === 'Pago' && (
                <div className="mt-2 flex items-center text-green-500">
                    <CheckCircle size={20} className="mr-1" /> Pago
                </div>
            )}
        </div>
    );
};
