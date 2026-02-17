
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Cleaning up orders...');

    // 1. Delete all order items
    const { error: err1 } = await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) throw err1;

    // 2. Delete all orders
    const { error: err2 } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) throw err2;

    console.log('Orders cleaned. Finding "Xeque Mate"...');

    // 3. Find Xeque Mate in menu_items
    const { data: menuItems, error: err3 } = await supabase
        .from('menu_items')
        .select('*, menus!inner(name, type)')
        .ilike('custom_name', '%xeque%');

    if (err3) throw err3;
    if (!menuItems || menuItems.length === 0) {
        console.log('Xeque Mate not found in menu_items. Checking products...');
        const { data: products, error: err4 } = await supabase
            .from('products')
            .select('*')
            .ilike('name', '%xeque%')
            .single();
        if (err4) throw err4;

        // Find a menu to add it to
        const { data: menu, error: err5 } = await supabase.from('menus').select('*').limit(1).single();
        if (err5) throw err5;

        // Add to menu_items first if not there? 
        // User said "do cardápio tradicional", so it should exist.
        // Let's assume it exists or we use the product info.
        throw new Error('Xeque Mate not found in any menu.');
    }

    const targetItem = menuItems[0];
    console.log(`Found item: ${targetItem.custom_name} - Price: ${targetItem.price}`);

    // 4. Create new order
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

    if (err6) throw err6;
    console.log(`Order created: ${newOrder.id}`);

    // 5. Create order item
    const { error: err7 } = await supabase
        .from('order_items')
        .insert({
            order_id: newOrder.id,
            menu_id: targetItem.menu_id,
            menu_item_id: targetItem.id,
            product_name: targetItem.custom_name,
            price: targetItem.price,
            quantity: 1,
            menu_type: targetItem.menus.type,
            menu_name: targetItem.menus.name
        });

    if (err7) throw err7;
    console.log('Order item added successfully.');
}

run().catch(console.error);
