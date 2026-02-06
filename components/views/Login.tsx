import React, { useState } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LoginProps {
    onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: supabaseError } = await supabase
                .from('auth_users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (supabaseError || !data) {
                setError('Usuário ou senha incorretos.');
                setLoading(false);
                return;
            }

            // Store in localStorage for persistence
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', username);
            onLogin();
        } catch (err) {
            setError('Ocorreu um erro ao tentar entrar. Tente novamente.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0d0a08] p-4">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-orange-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-orange-600/5 blur-[120px]" />
            </div>

            <div className="relative w-full max-w-[440px]">
                {/* Card */}
                <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#1a1614]/80 p-8 shadow-2xl backdrop-blur-xl">
                    {/* Logo Section */}
                    <div className="mb-8 flex flex-col items-center">
                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-600/10 p-2 border border-orange-600/20 shadow-[0_0_20px_rgba(234,88,12,0.15)] overflow-hidden">
                            <img src="/logo.svg" alt="Gestão Barismo Logo" className="h-full w-full object-cover rounded-full drop-shadow-lg" />
                        </div>
                        <h1 className="mb-2 text-center text-3xl font-black text-white tracking-tight leading-tight">
                            Bem vindo ao <span className="text-orange-500">gestão barismo!</span>
                        </h1>
                        <p className="text-center text-sm text-zinc-400">
                            Entre com suas credenciais para acessar o sistema
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-zinc-300">Usuário</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500 group-focus-within:text-orange-500 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-white placeholder-zinc-500 transition-all focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                    placeholder="admin"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-zinc-300">Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500 group-focus-within:text-orange-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-white placeholder-zinc-500 transition-all focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>


                        {error && (
                            <div className="text-center text-sm font-medium text-red-500 bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition-all hover:bg-orange-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? 'Entrando...' : (
                                <>
                                    Entrar
                                    <LogIn size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Card */}
                    <div className="mt-8 text-center text-[10px] uppercase tracking-widest text-zinc-600">
                        © 2024 BARSYSTEM ADMIN • GESTÃO PROFISSIONAL
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    Servidor Online
                </div>
            </div>
        </div>
    );
};
