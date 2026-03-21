import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, X, Check, Search, Shield, User, Database, AlertTriangle, Loader2 } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

interface AuthUser {
    id?: string | number;
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

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<AuthUser | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [bulkDeleteTarget, setBulkDeleteTarget] = useState<string | null>(null);
    const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [orderDeleteStartDate, setOrderDeleteStartDate] = useState('');
    const [orderDeleteEndDate, setOrderDeleteEndDate] = useState('');

    const isMasterAdmin = localStorage.getItem('username') === 'danielalencarsouz@gmail.com';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            let clientId = localStorage.getItem('clientId');
            const username = localStorage.getItem('username');

            if (!clientId && username) {
                const { data: authUser } = await supabase
                    .from('auth_users')
                    .select('client_id')
                    .eq('username', username)
                    .maybeSingle();

                if (authUser?.client_id) {
                    clientId = authUser.client_id;
                    localStorage.setItem('clientId', clientId);
                }
            }

            let query = supabase.from('auth_users').select('*').order('id', { ascending: true });

            if (clientId) {
                query = query.eq('client_id', clientId);
            } else if (!isMasterAdmin) {
                // Se não for master e não tiver ID, ele não deve ver nada
                setUsers([]);
                setIsLoading(false);
                return;
            }

            const { data, error } = await query;

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
            const clientId = localStorage.getItem('clientId');
            if (!clientId && !isMasterAdmin) throw new Error("ID do cliente não encontrado.");

            if (editingUser?.id) {
                // Update
                const updateData: any = { username: formData.username, role: formData.role };
                if (formData.password) {
                    updateData.password = formData.password;
                }
                let query = supabase
                    .from('auth_users')
                    .update(updateData)
                    .eq('id', editingUser.id);

                if (clientId && !isMasterAdmin) query = query.eq('client_id', clientId);
                const { error } = await query;

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
                    {
                        username: formData.username,
                        password: formData.password,
                        role: formData.role,
                        client_id: clientId || null
                    }
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

    const requestDelete = (user: AuthUser) => {
        if (user.username === 'danielalencarsouz@gmail.com') {
            showError("A credencial do administrador principal não pode ser removida.");
            return;
        }
        setUserToDelete(user);
        setDeleteConfirmText('');
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (deleteConfirmText !== "Eu tenho certeza desta exclusão") {
            showError("A frase de confirmação está incorreta. Tente novamente.");
            return;
        }
        if (!userToDelete || !userToDelete.id) return;

        try {
            const clientId = localStorage.getItem('clientId');
            if (!clientId && !isMasterAdmin) throw new Error("ID do cliente não encontrado.");

            let query = supabase
                .from('auth_users')
                .delete()
                .eq('id', userToDelete.id);

            if (clientId && !isMasterAdmin) query = query.eq('client_id', clientId);
            const { error } = await query;

            if (error) throw error;

            showSuccess("Credencial removida com sucesso.");
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
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

    const handleBulkDelete = async () => {
        if (bulkDeleteConfirmText !== "Zerar este módulo agora") return;
        setIsBulkDeleting(true);

        try {
            const clientId = localStorage.getItem('clientId');
            if (!clientId) throw new Error("ID do cliente não encontrado.");

            let error = null;

            switch (bulkDeleteTarget) {
                case 'orders':
                    if (!orderDeleteStartDate || !orderDeleteEndDate) {
                        throw new Error("Selecione a data inicial e final para excluir pedidos.");
                    }
                    const start = new Date(orderDeleteStartDate);
                    const end = new Date(orderDeleteEndDate);
                    end.setHours(23, 59, 59, 999);

                    const diffTime = end.getTime() - start.getTime();
                    const diffDays = diffTime / (1000 * 3600 * 24);

                    if (diffDays < 0) throw new Error("A data inicial não pode ser superior à data final.");
                    if (diffDays > 185) throw new Error("O período máximo permitido é de 6 meses por vez.");

                    const { error: itemsErr } = await supabase
                        .from('order_items')
                        .delete()
                        .eq('client_id', clientId)
                        .gte('created_at', start.toISOString())
                        .lte('created_at', end.toISOString());

                    if (itemsErr) throw itemsErr;

                    const { error: ordersErr } = await supabase
                        .from('orders')
                        .delete()
                        .eq('client_id', clientId)
                        .gte('created_at', start.toISOString())
                        .lte('created_at', end.toISOString());

                    error = ordersErr;
                    break;
                case 'stock':
                    const { error: stockErr } = await supabase.from('stock').update({ quantity: 0 }).eq('client_id', clientId);
                    error = stockErr;
                    break;
                case 'menu':
                    const { error: menuItemsErr } = await supabase.from('menu_items').delete().eq('client_id', clientId);
                    if (menuItemsErr) throw menuItemsErr;
                    const { error: menusErr } = await supabase.from('menus').delete().eq('client_id', clientId);
                    error = menusErr;
                    break;
                case 'categories':
                    // This is dangerous as it deletes the hierarchy
                    const { error: catItemsErr } = await supabase.from('menu_items').delete().eq('client_id', clientId);
                    if (catItemsErr) throw catItemsErr;
                    const { error: mErr } = await supabase.from('menus').delete().eq('client_id', clientId);
                    if (mErr) throw mErr;
                    const { error: sErr } = await supabase.from('stock').delete().eq('client_id', clientId);
                    if (sErr) throw sErr;
                    const { error: pErr } = await supabase.from('products').delete().eq('client_id', clientId);
                    if (pErr) throw pErr;
                    const { error: catErr } = await supabase.from('categories').delete().eq('client_id', clientId);
                    error = catErr;
                    break;
                case 'credentials':
                    const { error: credsErr } = await supabase
                        .from('auth_users')
                        .delete()
                        .eq('client_id', clientId)
                        .neq('username', 'danielalencarsouz@gmail.com');
                    error = credsErr;
                    break;
            }

            if (error) throw error;
            showSuccess("Dados excluídos com sucesso!");
            setIsBulkDeleteModalOpen(false);
            setBulkDeleteTarget(null);
            setBulkDeleteConfirmText('');
            setOrderDeleteStartDate('');
            setOrderDeleteEndDate('');
        } catch (err) {
            console.error("Erro na exclusão em massa:", err);
            showError("Erro ao processar exclusão em massa.");
        } finally {
            setIsBulkDeleting(false);
        }
    };

    if (!isMasterAdmin) {
        return (
            <main className="max-w-full mx-auto w-full h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                <div className="bg-[#1a1614] border border-white/5 p-12 rounded-3xl flex flex-col items-center text-center max-w-md shadow-2xl">
                    <div className="size-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                        <Shield size={40} className="text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">Acesso Restrito</h1>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                        Apenas o administrador master tem permissão para gerenciar credenciais e configurações globais do sistema.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="max-w-full overflow-x-hidden min-w-0 mx-auto w-full h-full flex flex-col p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Configurações de Acesso</h1>
                    <p className="text-zinc-400 mt-1">Gerencie as credenciais e níveis de acesso do sistema secundário.</p>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                    {isMasterAdmin && (
                        <button
                            onClick={() => setIsBulkDeleteModalOpen(true)}
                            className="flex-1 md:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                        >
                            <Database size={20} />
                            Dados
                        </button>
                    )}
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex-1 md:flex-none bg-primary hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={20} />
                        Credencial
                    </button>
                </div>
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
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className={`size-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                {user.role === 'admin' ? <Shield size={20} /> : <User size={20} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-white font-bold leading-none truncate" title={user.username}>{user.username}</h3>
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-2 inline-block whitespace-nowrap ${user.role === 'admin' ? 'bg-orange-500/10 text-orange-500' :
                                                    user.role === 'viewer' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        'bg-blue-500/10 text-blue-400'
                                                    }`}>
                                                    {user.role === 'admin' ? 'Administrador' :
                                                        user.role === 'viewer' ? 'Visualizador' :
                                                            'Usuário Padrão'}
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
                                                onClick={() => requestDelete(user)}
                                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Remover"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 truncate mt-2 select-all" title={user.id?.toString()}>
                                        ID: {user.id}
                                    </p>
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
                                            <option value="viewer">Visualizador</option>
                                            <option value="user">Usuário Padrão</option>
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

            {/* Modal de Confirmação de Exclusão */}
            {isDeleteModalOpen && userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#120f0e] border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
                                <Trash2 size={24} />
                                Confirmar Exclusão
                            </h2>
                            <button onClick={() => setIsDeleteModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={confirmDelete} className="p-6 flex-1">
                            <p className="text-zinc-300 mb-4 leading-relaxed">
                                Você está prestes a excluir a credencial de <strong className="text-white">{userToDelete.username}</strong>. Esta ação não pode ser desfeita.
                            </p>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Digite <strong className="text-white">"Eu tenho certeza desta exclusão"</strong> para confirmar:
                            </label>
                            <input
                                type="text"
                                required
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="w-full bg-[#1a1614] border border-red-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors mb-6"
                                placeholder="Digite a frase exata aqui..."
                            />

                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-zinc-300 hover:bg-white/5 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={deleteConfirmText !== "Eu tenho certeza desta exclusão"}
                                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    Confirmar Exclusão
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal de Gestão de Dados (Exclusão em Massa) */}
            {isBulkDeleteModalOpen && isMasterAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-[#120f0e] border border-red-500/30 rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col max-h-[90vh] overflow-hidden animate-in scale-95 duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-red-500 flex items-center gap-3 italic">
                                    <Database size={28} />
                                    EXCLUSÃO EM MASSA
                                </h2>
                                <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1 opacity-60">GESBAR // LIMPEZA DE DADOS</p>
                            </div>
                            <button onClick={() => { setIsBulkDeleteModalOpen(false); setBulkDeleteTarget(null); }} className="size-10 rounded-2xl bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto scrollbar-none">
                            {!bulkDeleteTarget ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { id: 'orders', label: 'Todos os Pedidos', icon: 'receipt_long', desc: 'Remove histórico e itens de pedidos' },
                                        { id: 'stock', label: 'Esvaziar Estoque', icon: 'inventory_2', desc: 'Zera as quantidades de todos os itens' },
                                        { id: 'menu', label: 'Limpar Cardápios', icon: 'restaurant_menu', desc: 'Remove cardápios e itens vinculados' },
                                        { id: 'categories', label: 'Remover Categorias', icon: 'category', desc: 'Apaga todas as categorias e produtos' },
                                        { id: 'credentials', label: 'Limpar Credenciais', icon: 'badge', desc: 'Remove todos os acessos exceto o admin' }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setBulkDeleteTarget(item.id);
                                                setOrderDeleteStartDate('');
                                                setOrderDeleteEndDate('');
                                            }}
                                            className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/5 transition-all group text-left"
                                        >
                                            <div className="size-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-red-500/20 group-hover:text-red-500 transition-all">
                                                <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                                            </div>
                                            <div>
                                                <h3 className="text-white font-black uppercase tracking-tighter italic text-lg">{item.label}</h3>
                                                <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
                                        <div className="flex items-center gap-3 text-red-500 mb-3">
                                            <AlertTriangle size={24} />
                                            <h3 className="font-black text-lg uppercase italic">AVISO CRÍTICO</h3>
                                        </div>
                                        <p className="text-red-200/80 text-sm leading-relaxed">
                                            Você selecionou <strong className="text-white">"{bulkDeleteTarget === 'orders' ? 'PEDIDOS' : bulkDeleteTarget === 'stock' ? 'ESTOQUE' : bulkDeleteTarget === 'menu' ? 'CARDÁPIOS' : bulkDeleteTarget === 'credentials' ? 'CREDENCIAIS' : 'CATEGORIAS'}"</strong> para exclusão em massa. Esta ação é irreversível e afetará permanentemente os dados.
                                        </p>
                                    </div>

                                    {bulkDeleteTarget === 'orders' && (
                                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                                            <label className="block text-[11px] font-black text-white/50 uppercase tracking-[0.2em] mb-2 text-center">
                                                Selecione o Período (Máx. 6 Meses)
                                            </label>
                                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                                                <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-2 w-full sm:w-auto">
                                                    <span className="text-zinc-500 text-xs font-black uppercase">De:</span>
                                                    <input
                                                        type="date"
                                                        value={orderDeleteStartDate}
                                                        onChange={(e) => setOrderDeleteStartDate(e.target.value)}
                                                        className="bg-transparent text-white focus:outline-none text-sm font-mono w-full"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-2 w-full sm:w-auto">
                                                    <span className="text-zinc-500 text-xs font-black uppercase">Até:</span>
                                                    <input
                                                        type="date"
                                                        value={orderDeleteEndDate}
                                                        onChange={(e) => setOrderDeleteEndDate(e.target.value)}
                                                        className="bg-transparent text-white focus:outline-none text-sm font-mono w-full"
                                                        max={new Date().toISOString().split('T')[0]}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 p-6 bg-black/40 rounded-3xl border border-red-500/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none transition-transform group-focus-within:scale-110">
                                            <AlertTriangle size={120} />
                                        </div>

                                        <label className="block text-[11px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 text-center">
                                            Validação de Segurança
                                        </label>

                                        <div className="text-center space-y-2 mb-6">
                                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Digite a frase abaixo:</p>
                                            <p className="text-white text-xl font-black italic uppercase tracking-tighter select-none">
                                                "Zerar este módulo <span className="text-red-500 underline decoration-2 underline-offset-4">agora</span>"
                                            </p>
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={bulkDeleteConfirmText}
                                                onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
                                                className="w-full bg-white/[0.03] border-2 border-red-500/10 rounded-2xl px-6 py-5 text-white focus:border-red-500 focus:bg-red-500/5 focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-black text-center text-sm uppercase tracking-[0.1em] placeholder:text-zinc-800"
                                                placeholder="..."
                                            />
                                            {bulkDeleteConfirmText === "Zerar este módulo agora" && (
                                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
                                                    Senha Validada
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-white/5 bg-white/5 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    if (bulkDeleteTarget) setBulkDeleteTarget(null);
                                    else setIsBulkDeleteModalOpen(false);
                                    setBulkDeleteConfirmText('');
                                    setOrderDeleteStartDate('');
                                    setOrderDeleteEndDate('');
                                }}
                                className="px-6 py-3 rounded-xl text-zinc-500 font-black uppercase tracking-widest text-[10px] hover:text-white transition-all"
                                disabled={isBulkDeleting}
                            >
                                {bulkDeleteTarget ? 'Voltar' : 'Fechar'}
                            </button>
                            {bulkDeleteTarget && (
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleteConfirmText !== "Zerar este módulo agora" || isBulkDeleting}
                                    className="flex items-center gap-3 px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-red-500/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    {isBulkDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                    CONFIRMAR EXCLUSÃO TOTAL
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

