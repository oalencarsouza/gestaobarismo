import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
}

const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
    const clientId = localStorage.getItem('clientId');
    if (clientId) {
        const headers = new Headers(options?.headers);
        headers.set('x-client-id', clientId);
        options = { ...options, headers };
    }
    return fetch(url, options);
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    global: {
        fetch: customFetch
    }
});
