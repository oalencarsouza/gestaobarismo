import React, { useState, useEffect } from 'react';
import { StockStatusBadge } from '../StatusBadge';
import { supabase } from '../../lib/supabase';
import { CreateMenuModal } from '../CreateMenuModal';
import { AddMenuItemModal } from '../AddMenuItemModal';
import { useNotification } from '../../contexts/NotificationContext';
import { PlusCircle, Search, ChevronLeft, Trash2, LayoutGrid, Loader2, Pencil } from 'lucide-react';
import type { Menu, Product, Category, MenuItem } from '../../types';

export const MenuView: React.FC = () => {
    const { showError, showSuccess } = useNotification();
    const [menus, setMenus] = useState<Menu[]>([]);
    const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal States
    const [isCreateMenuModalOpen, setIsCreateMenuModalOpen] = useState(false);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null);

    React.useEffect(() => {
        fetchMenus();
    }, []);

    React.useEffect(() => {
        if (selectedMenu) {
            fetchMenuItems(selectedMenu.id);
        }
    }, [selectedMenu]);

    const fetchMenus = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('menus')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMenus(data || []);
        } catch (error) {
            console.error('Erro ao buscar cardápios:', error);
            showError('Não foi possível carregar os cardápios.');
        } finally {
            setLoading(false);
        }
    };

    const fetchMenuItems = async (menuId: string) => {
        try {
            const { data, error } = await supabase
                .from('menu_items')
                .select('*, product:products(*)')
                .eq('menu_id', menuId);

            if (error) throw error;
            setMenuItems(data || []);
        } catch (error) {
            console.error('Erro ao buscar itens:', error);
            showError('Não foi possível carregar os itens do cardápio.');
        }
    };

    const handleDeleteMenuItem = async (itemId: string) => {
        if (!confirm('Tem certeza que deseja remover este item do cardápio?')) return;
        try {
            const { error } = await supabase
                .from('menu_items')
                .delete()
                .eq('id', itemId);

            if (error) throw error;
            setMenuItems(prev => prev.filter(item => item.id !== itemId));
            showSuccess('Item removido com sucesso!');
        } catch (error) {
            showError('Erro ao remover o item.');
        }
    };

    const handleEditItem = (item: MenuItem) => {
        setItemToEdit(item);
        setIsAddItemModalOpen(true);
    };

    const filteredMenus = menus.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredItems = menuItems.filter(item =>
        item.product?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-4">
                    {selectedMenu && (
                        <button
                            onClick={() => setSelectedMenu(null)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-all"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-white text-3xl font-black tracking-tight">
                            {selectedMenu ? selectedMenu.name : 'Gestão de Cardápios'}
                        </h2>
                        <p className="text-gray-400 text-base mt-1">
                            {selectedMenu ? selectedMenu.description : 'Crie e gerencie seus diferentes cardápios e preços.'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex-1 lg:min-w-[250px]">
                        <Search className="text-gray-500" size={20} />
                        <input
                            type="text"
                            placeholder={selectedMenu ? "Buscar item..." : "Buscar cardápio..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-500 flex-1 outline-none"
                        />
                    </div>
                    {selectedMenu ? (
                        <button
                            onClick={() => setIsAddItemModalOpen(true)}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all whitespace-nowrap"
                        >
                            <PlusCircle size={20} />
                            Adicionar Item
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsCreateMenuModalOpen(true)}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all whitespace-nowrap"
                        >
                            <PlusCircle size={20} />
                            Novo Cardápio
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
            ) : !selectedMenu ? (
                /* Menu List View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMenus.map(menu => (
                        <div
                            key={menu.id}
                            onClick={() => setSelectedMenu(menu)}
                            className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                                <LayoutGrid className="text-primary" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{menu.name}</h3>
                            <p className="text-gray-400 text-sm line-clamp-2 mb-4">{menu.description || 'Sem descrição.'}</p>
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                                <span className={menu.active ? 'text-green-500' : 'text-gray-500'}>
                                    {menu.active ? 'Ativo' : 'Inativo'}
                                </span>
                                <span className="text-gray-500">
                                    {new Date(menu.created_at || '').toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </div>
                    ))}
                    {filteredMenus.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <p className="text-gray-400">Nenhum cardápio encontrado.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Menu Details View (Items) */
                <div className="space-y-6">
                    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-gray-400 text-xs font-medium border-b border-white/10 uppercase tracking-wider">
                                    <th className="px-6 py-4">Produto</th>
                                    <th className="px-6 py-4">Preço no Cardápio</th>
                                    <th className="px-6 py-4">Preço Original</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 text-sm">
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium">{item.product?.name}</span>
                                                <span className="text-gray-500 text-xs">{item.product?.category_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-primary font-bold font-numbers text-lg">
                                                R$ {item.price.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-numbers italic">
                                            R$ {item.product?.price.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditItem(item);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-primary transition-colors"
                                                    title="Editar preço"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteMenuItem(item.id);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Remover do cardápio"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-gray-500 italic">
                                            Nenhum item adicionado a este cardápio ainda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            <CreateMenuModal
                isOpen={isCreateMenuModalOpen}
                onClose={() => setIsCreateMenuModalOpen(false)}
                onSuccess={fetchMenus}
            />
            {selectedMenu && (
                <AddMenuItemModal
                    isOpen={isAddItemModalOpen}
                    onClose={() => {
                        setIsAddItemModalOpen(false);
                        setItemToEdit(null);
                    }}
                    onSuccess={() => fetchMenuItems(selectedMenu.id)}
                    menuId={selectedMenu.id}
                    editingItem={itemToEdit}
                />
            )}
        </main>
    );
};
