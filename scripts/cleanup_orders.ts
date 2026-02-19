
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no arquivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Iniciando Limpeza de Pedidos ---');

    // 1. Deletar todos os pedidos (isso já limpa os itens via ON DELETE CASCADE no banco)
    console.log('Limpando tabelas orders e order_items...');
    const { error: err1 } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) {
        console.error('Erro ao limpar pedidos:', err1.message);
        throw err1;
    }

    console.log('Pedidos limpos com sucesso.');

    // 2. Buscar "Xeque Mate"
    console.log('Buscando "Xeque Mate" no cardápio...');

    // Tenta buscar primeiro em menu_items
    const { data: menuItems, error: err3 } = await supabase
        .from('menu_items')
        .select('*, menus!inner(name, type)')
        .ilike('custom_name', '%xeque%')
        .limit(1);

    let targetItem = menuItems && menuItems.length > 0 ? menuItems[0] : null;

    if (err3) console.warn('Aviso: Erro ao buscar em menu_items:', err3.message);

    if (!targetItem) {
        console.log('Xeque Mate não encontrado em menu_items. Buscando em produtos...');
        const { data: products, error: err4 } = await supabase
            .from('products')
            .select('*')
            .ilike('name', '%xeque%')
            .limit(1);

        if (err4) throw err4;

        if (!products || products.length === 0) {
            console.error('Erro: "Xeque Mate" não encontrado em lugar nenhum.');
            return;
        }

        const product = products[0];
        console.log(`Encontrado produto: ${product.name}. Buscando se ele está em algum cardápio...`);

        // Busca se esse produto está em algum menu_item
        const { data: itemsFromProduct, error: err5 } = await supabase
            .from('menu_items')
            .select('*, menus!inner(name, type)')
            .eq('product_id', product.id)
            .limit(1);

        if (err5) throw err5;

        if (!itemsFromProduct || itemsFromProduct.length === 0) {
            console.error(`Erro: O produto "${product.name}" existe, mas não está em nenhum cardápio ativo.`);
            return;
        }
        targetItem = itemsFromProduct[0];
    }

    console.log(`Item alvo encontrado: ${targetItem.custom_name || 'Produto'} - Preço: R$ ${targetItem.price}`);

    // 3. Criar pedido de teste
    console.log('Criando novo pedido para "Marcos Silva"...');
    const { data: newOrder, error: err6 } = await supabase
        .from('orders')
        .insert({
            client_name: 'Marcos Silva',
            client_phone: '(11) 98888-7777',
            status: 'Aberto',
            total: targetItem.price
        })
        .select()
        .single();

    if (err6) {
        console.error('Erro ao criar pedido:', err6.message);
        if (err6.message.includes('column "client_phone" does not exist')) {
            console.log('Tentando criar pedido sem o campo client_phone (coluna ausente no DB)...');
            const { data: fallbackOrder, error: errFallback } = await supabase
                .from('orders')
                .insert({
                    client_name: 'Marcos Silva',
                    status: 'Aberto',
                    total: targetItem.price
                })
                .select()
                .single();

            if (errFallback) throw errFallback;
            return await addOrderItem(fallbackOrder, targetItem);
        }
        throw err6;
    }

    await addOrderItem(newOrder, targetItem);
}

async function addOrderItem(order: any, item: any) {
    console.log(`Pedido criado: ${order.id}. Adicionando item...`);

    const { error: err7 } = await supabase
        .from('order_items')
        .insert({
            order_id: order.id,
            menu_id: item.menu_id,
            menu_item_id: item.id,
            product_name: item.custom_name || item.products?.name || 'Item do Cardápio',
            price: item.price,
            quantity: 1,
            menu_type: item.menus?.type || 'tradicional',
            menu_name: item.menus?.name || 'Cardápio'
        });

    if (err7) {
        console.error('Erro ao adicionar item ao pedido:', err7.message);
        throw err7;
    }

    console.log('--- Processo concluído com sucesso! ---');
}

run().catch(err => {
    console.error('FALHA NO SCRIPT:', err);
});
