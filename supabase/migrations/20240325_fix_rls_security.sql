-- 1. IDENTIFICAÇÃO DO CLIENTE (HEADER)
-- Criamos uma função helper para ler o 'x-client-id' dos headers.
CREATE OR REPLACE FUNCTION public.get_request_client_id()
RETURNS text 
LANGUAGE sql 
STABLE 
SET search_path = public
AS $$
  SELECT current_setting('request.headers', true)::json->>'x-client-id';
$$;

-- 2. LIMPEZA AUTOMÁTICA DE POLÍTICAS INSEGURAS
-- Remove qualquer política existente que contenha 'USING (true)'.
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (qual = '(true)' OR with_check = '(true)') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. SEGURANÇA MULTI-TENANCY COM BYPASS DE ADMINISTRADOR MASTER
-- Aplica isolamento de dados por 'client_id' e garante acesso total ao email do master.
DO $$
DECLARE
    table_name text;
    tables_to_fix text[] := ARRAY['auth_users', 'categories', 'products', 'stock', 'menus', 'menu_items', 'orders', 'order_items'];
    master_email text := 'danielalencarsouz@gmail.com';
BEGIN
    FOREACH table_name IN ARRAY tables_to_fix LOOP
        -- Ativar Row Level Security
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        
        -- Remover regra segura persistente caso já exista (Idempotência)
        EXECUTE format('DROP POLICY IF EXISTS "secure_tenant_access_%s" ON public.%I', table_name, table_name);
        
        -- Criar nova regra blindada pelo client_id E acesso por email master
        EXECUTE format('
            CREATE POLICY "secure_tenant_access_%s" ON public.%I
            FOR ALL
            TO authenticated
            USING (
                (client_id::text IS NOT DISTINCT FROM public.get_request_client_id())
                OR (auth.jwt() ->> ''email'' = %L)
            )
            WITH CHECK (
                (client_id::text IS NOT DISTINCT FROM public.get_request_client_id())
                OR (auth.jwt() ->> ''email'' = %L)
            )
        ', table_name, table_name, master_email, master_email);
    END LOOP;
END $$;
