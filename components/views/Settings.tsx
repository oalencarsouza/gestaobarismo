import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, X, Check, Search, Shield, User } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

interface AuthUser {
    id?: number;
    username: string;
    password?: string;
    role: string;
}

export const Settings: React.FC = () => {
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { showSuccess, showError } = useNotification();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
    const [formData, setFormData] = useState<AuthUser>({ username: '', password: '', role: 'user' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('auth_users').select('*').order('id', { ascending: true });
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Erro ao carregar usuários:", error);
            showError("Erro ao carregar os credenciais de acesso.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (user?: AuthUser) => {
        if (user) {
            setEditingUser(user);
            setFormData({ ...user, password: '' }); // Don't show password by default
        } else {
            setEditingUser(null);
            setFormData({ username: '', password: '', role: 'user' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ username: '', password: '', role: 'user' });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingUser?.id) {
                // Update
                const updateData: any = { username: formData.username, role: formData.role };
                if (formData.password) {
                    updateData.password = formData.password; // Update password only if provided
                }
                const { error } = await supabase.from('auth_users').update(updateData).eq('id', editingUser.id);
                if (error) throw error;
                showSuccess("Credencial atualizada com sucesso!");
            } else {
                // Insert
                if (!formData.password) {
                    showError("A senha é obrigatória para novos usuários.");
                    setIsSaving(false);
                    return;
                }
                const { error } = await supabase.from('auth_users').insert([
                    { username: formData.username, password: formData.password, role: formData.role }
                ]);
                if (error) throw error;
                showSuccess("Nova credencial criada com sucesso!");
            }
            handleCloseModal();
            fetchUsers();
        } catch (error) {
            console.error("Erro ao salvar usuário:", error);
            showError("Erro ao salvar as credenciais.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Tem certeza que deseja remover esta credencial de acesso?")) return;
        try {
            const { error } = await supabase.from('auth_users').delete().eq('id', id);
            if (error) throw error;
            showSuccess("Credencial removida com sucesso.");
            fetchUsers();
        } catch (error) {
            console.error("Erro ao deletar usuário:", error);
            showError("Erro ao deletar a credencial.");
        }
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <main className="max-w-full overflow-x-hidden min-w-0 mx-auto w-full h-full flex flex-col p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Configurações de Acesso</h1>
                    <p className="text-zinc-400 mt-1">Gerencie as credenciais e níveis de acesso do sistema secundário.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                >
                    <Plus size={20} />
                    Nova Credencial
                </button>
            </div>

            <div className="bg-[#120f0e] border border-white/5 rounded-2xl flex flex-col flex-1 overflow-hidden shadow-2xl">
                <div className="p-4 md:p-6 border-b border-white/5 bg-white/5">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por usuário ou nível de acesso..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1a1614] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 md:p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                            <Shield size={48} className="mb-4 opacity-50" />
                            <p className="font-medium text-lg text-white">Nenhuma credencial encontrada</p>
                            <p className="text-sm">Tente ajustar a sua busca ou crie um novo acesso.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredUsers.map((user) => (
                                <div key={user.id} className="bg-[#1a1614] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                {user.role === 'admin' ? <Shield size={20} /> : <User size={20} />}
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold leading-none">{user.username}</h3>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-2 inline-block ${user.role === 'admin' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-400'}`}>
                                                    {user.role === 'admin' ? 'Administrador' : 'Usuário Padrão'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleOpenModal(user)}
                                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => user.id && handleDelete(user.id)}
                                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Remover"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500">ID: {user.id}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div >

            {/* Modal de Criação / Edição */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#120f0e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">
                                    {editingUser ? 'Editar Credencial' : 'Nova Credencial'}
                                </h2>
                                <button onClick={handleCloseModal} className="text-zinc-500 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Nome de Usuário (Login)</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full bg-[#1a1614] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                                            placeholder="Ex: joao2024"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Senha {editingUser && '(deixe em branco para manter)'}</label>
                                        <input
                                            type="password"
                                            required={!editingUser}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full bg-[#1a1614] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                                            placeholder="Digite a senha de acesso"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Nível de Acesso (Papel)</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full bg-[#1a1614] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                                        >
                                            <option value="user">Usuário Padrão (Sem edições de perfil/config)</option>
                                            <option value="admin">Administrador (Total Acesso)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3 pt-4 border-t border-white/5 justify-end">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-5 py-2.5 rounded-xl text-zinc-300 hover:bg-white/5 font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Check size={18} />
                                                Salvar Credencial
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </main >
    );
};
