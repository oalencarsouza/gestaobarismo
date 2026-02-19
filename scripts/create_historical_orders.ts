
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Criando Pedidos Históricos para Teste ---');

    // 1. Buscar um item de cardápio válido
    const { data: menuItems, error: errItem } = await supabase
        .from('menu_items')
        .select('*, menus!inner(name, type)')
        .limit(1);

    if (errItem || !menuItems || menuItems.length === 0) {
        console.error('Erro: Nenhum item de cardápio encontrado para criar os pedidos.');
        return;
    }

    const item = menuItems[0];
    const clients = [
        { name: 'Ana Souza', dayOffset: 1 }, // Ontem
        { name: 'Ricardo Lima', dayOffset: 2 }, // Antes de ontem
        { name: 'Carla Dias', dayOffset: 3 }  // 3 dias atrás
    ];

    for (const client of clients) {
        const date = new Date();
        date.setDate(date.getDate() - client.dayOffset);
        // Garantir que o horário seja fora da sessão atual (ex: 14:00)
        date.setHours(14, 0, 0, 0);

        console.log(`Criando pedido para ${client.name} na data ${date.toISOString()}...`);

        // Criar Pedido
        const { data: order, error: errOrder } = await supabase
            .from('orders')
            .insert({
                client_name: client.name,
                client_phone: '(11) 99999-0000',
                status: 'Pago',
                total: item.price,
                created_at: date.toISOString(),
                updated_at: date.toISOString()
            })
            .select()
            .single();

        if (errOrder) {
            console.error(`Erro ao criar pedido para ${client.name}:`, errOrder.message);
            continue;
        }

        // Criar Item do Pedido
        const { error: errOrderItem } = await supabase
            .from('order_items')
            .insert({
                order_id: order.id,
                menu_id: item.menu_id,
                menu_item_id: item.id,
                product_name: item.custom_name || 'Item de Teste',
                price: item.price,
                quantity: 1,
                menu_type: item.menus.type,
                menu_name: item.menus.name,
                created_at: date.toISOString()
            });

        if (errOrderItem) {
            console.error(`Erro ao criar item para ${client.name}:`, errOrderItem.message);
        } else {
            console.log(`Sucesso: Pedido de ${client.name} criado.`);
        }
    }

    console.log('--- Processo concluído ---');
}

run().catch(console.error);
