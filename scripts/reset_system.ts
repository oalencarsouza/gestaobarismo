
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function reset() {
    console.log('--- Iniciando Limpeza Total de Pedidos ---');

    try {
        // Deletar todos os pedidos
        // O banco de dados está configurado com ON DELETE CASCADE, 
        // então deletar de 'orders' limpa automaticamente 'order_items'.
        const { error, count } = await supabase
            .from('orders')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo que não tem esse ID impossível

        if (error) throw error;

        console.log('Sucesso: Todos os pedidos (atuais e históricos) foram excluídos.');
        console.log('O sistema agora está limpo para seus testes de 4 dias.');
    } catch (err: any) {
        console.error('Erro ao limpar o sistema:', err.message);
    }

    console.log('--- Processo concluído ---');
}

reset().catch(console.error);
