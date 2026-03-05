
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreateMenuModal } from '../CreateMenuModal';
import { AddMenuItemModal } from '../AddMenuItemModal';
import { ConfirmModal } from '../ConfirmModal';
import { useNotification } from '../../contexts/NotificationContext';
import { PlusCircle, Search, ChevronLeft, ChevronRight, Trash2, LayoutGrid, Loader2, Pencil, Coffee, Percent, Copy, Sparkles, X } from 'lucide-react';
import type { Menu, MenuItem, MenuType } from '../../types';

const TYPE_CONFIG: Record<MenuType, { label: string; color: string; icon: React.ReactNode }> = {
    tradicional: { label: 'Tradicional', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', icon: <Coffee size={14} /> },
    desconto: { label: 'Desconto', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <Percent size={14} /> },
    quantidade: { label: 'Pague 1 Leve 2', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: <Copy size={14} /> },
    especial: { label: 'Especial', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: <Sparkles size={14} /> },
};

export const MenuView: React.FC = () => {
    const { showError, showSuccess } = useNotification();
    const [menus, setMenus] = useState<Menu[]>([]);
    const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cardSlideIndex, setCardSlideIndex] = useState(0);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;

    const userRole = localStorage.getItem('userRole');
    const isViewer = userRole === 'viewer';

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);

    // Modal States
    const [isCreateMenuModalOpen, setIsCreateMenuModalOpen] = useState(false);
    const [menuToEdit, setMenuToEdit] = useState<Menu | null>(null);

    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDestructive: false,
    });

    React.useEffect(() => {
        fetchMenus();
    }, []);

    React.useEffect(() => {
        if (selectedMenu) {
            fetchMenuItems(selectedMenu.id);
            setCurrentPage(1); // Reset page on menu change
        }
    }, [selectedMenu]);

    React.useEffect(() => {
        setCurrentPage(1); // Reset page on search
    }, [searchTerm]);

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

    const handleDeleteMenu = (menu: Menu, e: React.MouseEvent) => {
        e.stopPropagation();

        setConfirmModal({
            isOpen: true,
            title: 'Excluir Cardápio',
            message: `Tem certeza que deseja excluir o cardápio "${menu.name}"? Esta ação não pode ser desfeita e excluirá todos os itens associados.`,
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('menus')
                        .delete()
                        .eq('id', menu.id);

                    if (error) throw error;

                    setMenus(prev => prev.filter(m => m.id !== menu.id));
                    if (selectedMenu?.id === menu.id) setSelectedMenu(null);
                    showSuccess('Cardápio excluído com sucesso!');
                } catch (error) {
                    console.error('Erro ao excluir cardápio:', error);
                    showError('Erro ao excluir o cardápio.');
                }
            }
        });
    };

    const handleMenuClick = (menu: Menu) => {
        if (isEditMode) {
            // In Edit Mode, clicking the card opens the Edit Modal
            setMenuToEdit(menu);
            setIsCreateMenuModalOpen(true);
        } else {
            // Normal Mode, open details
            setSelectedMenu(menu);
        }
    };

    const handleDeleteMenuItem = (itemId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remover Item',
            message: 'Tem certeza que deseja remover este item do cardápio?',
            isDestructive: true,
            onConfirm: async () => {
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
            }
        });
    };

    const handleEditItem = (item: MenuItem) => {
        setItemToEdit(item);
        setIsAddItemModalOpen(true);
    };

    const getItemName = (item: MenuItem): string => {
        if (item.product_id && item.product) {
            return item.product.name;
        }
        return item.custom_name || 'Item sem nome';
    };

    const getItemSubtext = (item: MenuItem): string => {
        if (item.product_id && item.product) {
            return 'Produto do estoque';
        }
        return item.custom_description || 'Item personalizado';
    };

    const filteredMenus = menus.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredItems = menuItems.filter(item => {
        const name = getItemName(item);
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Pagination Logic
    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const getTypeBadge = (menu: Menu) => {
        const config = TYPE_CONFIG[menu.type || 'tradicional'];
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.color}`}>
                {config.icon}
                {menu.type === 'quantidade' ? (
                    <>
                        <span className="hidden sm:inline">{config.label}</span>
                        <span className="sm:hidden font-black">1 = 2!</span>
                    </>
                ) : menu.type === 'desconto' && menu.discount_percent ? (
                    <>
                        <span className="hidden sm:inline">{config.label} {menu.discount_percent}%</span>
                        <span className="sm:hidden font-black">{menu.discount_percent}%</span>
                    </>
                ) : (
                    <span>{config.label}</span>
                )}
            </span>
        );
    };

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto overflow-x-hidden min-w-0 bg-background-dark">
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
                        <div className="flex items-center gap-3">
                            <h2 className="text-white text-3xl font-black tracking-tight">
                                {selectedMenu ? (isMobile ? TYPE_CONFIG[selectedMenu.type || 'tradicional'].label : selectedMenu.name) : 'Gestão de Cardápios'}
                            </h2>
                            {selectedMenu && getTypeBadge(selectedMenu)}
                        </div>
                        <p className="text-gray-400 text-base mt-1">
                            {selectedMenu ? selectedMenu.description : 'Crie e gerencie seus diferentes cardápios e preços.'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-2 flex-1 lg:min-w-[250px]">
                        <Search className="text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder={selectedMenu ? "Buscar item..." : "Buscar cardápio..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-500 flex-1 outline-none text-xs sm:text-sm"
                        />
                    </div>

                    {selectedMenu ? (
                        !isViewer && (
                            <button
                                onClick={() => setIsAddItemModalOpen(true)}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all whitespace-nowrap"
                            >
                                <PlusCircle size={20} />
                                <span className="hidden sm:inline">Adicionar Item</span>
                            </button>
                        )
                    ) : (
                        !isViewer && (
                            <div className="flex gap-2">
                                {/* Edit Mode Toggle */}
                                <button
                                    onClick={() => setIsEditMode(!isEditMode)}
                                    className={`p-3 rounded-lg border transition-all ${isEditMode
                                        ? 'bg-red-500/10 border-red-500/50 text-red-500'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                        }`}
                                    title={isEditMode ? "Sair do modo de edição" : "Editar/Excluir cardápios"}
                                >
                                    {isEditMode ? <X size={20} /> : <Pencil size={20} />}
                                </button>

                                <button
                                    onClick={() => {
                                        setMenuToEdit(null);
                                        setIsCreateMenuModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all whitespace-nowrap"
                                >
                                    <PlusCircle size={20} />
                                    <span className="hidden sm:inline">Novo Cardápio</span>
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
            ) : !selectedMenu ? (
                /* Menu List View */
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(() => {
                            const filtered = filteredMenus;
                            const visible = isMobile
                                ? filtered.slice(cardSlideIndex, cardSlideIndex + 2)
                                : filtered;

                            return visible.map(menu => (
                                <div
                                    key={menu.id}
                                    onClick={() => handleMenuClick(menu)}
                                    className={`group p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${isEditMode
                                        ? 'bg-white/5 border-primary/50 hover:bg-primary/5'
                                        : 'bg-white/5 border-white/10 hover:border-primary/50'
                                        }`}
                                >
                                    {/* ... icon indicator ... */}
                                    <div className="absolute top-0 right-0 p-4 transition-all z-10">
                                        {isEditMode && !isViewer ? (
                                            <button
                                                onClick={(e) => handleDeleteMenu(menu, e)}
                                                className="p-2 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                                                title="Excluir Cardápio"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        ) : (
                                            <LayoutGrid className="text-primary opacity-20 group-hover:opacity-100 transition-opacity" size={24} />
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mb-2 pr-12">
                                        <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors truncate w-full">
                                            {menu.name}
                                        </h3>
                                    </div>

                                    <p className="text-gray-400 text-sm line-clamp-2 mb-3 h-10">
                                        {menu.description || 'Sem descrição.'}
                                    </p>

                                    <div className="mb-3">
                                        {getTypeBadge(menu)}
                                    </div>

                                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                                        <span className={menu.active ? 'text-green-500' : 'text-gray-500'}>
                                            {menu.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                        <span className="text-gray-500">
                                            {new Date(menu.created_at || '').toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>

                                    {/* Edit Mode Overlay Hint */}
                                    {isEditMode && !isViewer && (
                                        <div className="absolute inset-x-0 bottom-0 bg-primary/10 py-1 text-center text-xs font-bold text-primary border-t border-primary/20">
                                            Clique para editar
                                        </div>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>

                    {isMobile && filteredMenus.length > 2 && (
                        <div className="flex items-center justify-center gap-4 mt-2">
                            <button
                                onClick={() => setCardSlideIndex(prev => Math.max(0, prev - 1))}
                                disabled={cardSlideIndex === 0}
                                className="size-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-gray-400 disabled:opacity-20 transition-all shadow-xl"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                {Math.floor(cardSlideIndex / 2) + 1} / {Math.ceil(filteredMenus.length / 2)}
                            </span>
                            <button
                                onClick={() => setCardSlideIndex(prev => Math.min(filteredMenus.length - 2, prev + 1))}
                                disabled={cardSlideIndex >= filteredMenus.length - 2}
                                className="size-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-gray-400 disabled:opacity-20 transition-all shadow-xl"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    )}

                    {filteredMenus.length === 0 && (
                        <div className="py-20 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <p className="text-gray-400">Nenhum cardápio encontrado.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Menu Details View (Items) */
                <div className="space-y-6">
                    {/* Desktop View (Table) */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10 bg-white/5 shadow-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-gray-400 text-xs font-medium border-b border-white/10 uppercase tracking-wider">
                                    <th className="px-6 py-4">Item</th>
                                    <th className="px-6 py-4">Preço no Cardápio</th>
                                    <th className="px-6 py-4">Preço Original</th>
                                    {selectedMenu.type === 'quantidade' && <th className="px-6 py-4">Promoção</th>}
                                    {!isViewer && <th className="px-6 py-4 text-right">Ações</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 text-sm">
                                {paginatedItems.map(item => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-white font-medium ${!item.product_id ? 'underline decoration-purple-500/50 underline-offset-4' : ''}`}>
                                                        {getItemName(item)}
                                                    </span>
                                                    {!item.product_id && (
                                                        <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded-full uppercase">
                                                            Personalizado
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-gray-500 text-xs">{getItemSubtext(item)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-primary font-bold font-numbers text-lg">
                                                R$ {item.price.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-numbers italic">
                                            {item.product?.price
                                                ? `R$ ${item.product.price.toFixed(2)}`
                                                : '—'
                                            }
                                        </td>
                                        {selectedMenu.type === 'quantidade' && (
                                            <td className="px-6 py-4">
                                                <span className="text-blue-400 font-bold bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded-lg text-xs">
                                                    2x
                                                </span>
                                            </td>
                                        )}
                                        {!isViewer && (
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
                                        )}
                                    </tr>
                                ))}
                                {paginatedItems.length === 0 && (
                                    <tr>
                                        <td colSpan={selectedMenu.type === 'quantidade' ? (isViewer ? 4 : 5) : (isViewer ? 3 : 4)} className="px-6 py-20 text-center text-gray-500 italic">
                                            Nenhum item adicionado a este cardápio ainda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View (Cards) */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {paginatedItems.map(item => (
                            <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group active:scale-[0.98] transition-all">
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className={`text-white font-black uppercase italic tracking-tight truncate ${!item.product_id ? 'underline decoration-purple-500/60 underline-offset-4' : ''}`}>
                                        {getItemName(item)}
                                    </span>
                                    <span className="text-gray-500 text-[10px] uppercase font-black tracking-widest leading-none mt-1">
                                        {getItemSubtext(item)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 ml-4">
                                    <span className="text-primary font-black text-lg italic tracking-tighter whitespace-nowrap">
                                        R$ {item.price.toFixed(2)}
                                    </span>
                                    {!isViewer && (
                                        <div className="flex items-center gap-1 border-l border-white/5 pl-3">
                                            <button
                                                onClick={() => handleEditItem(item)}
                                                className="p-2 text-zinc-500 hover:text-primary transition-colors"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMenuItem(item.id)}
                                                className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {paginatedItems.length === 0 && (
                            <div className="py-20 text-center text-gray-500 italic bg-white/5 rounded-2xl border border-white/10">
                                Nenhum item neste cardápio.
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-white/10 text-sm text-gray-400 bg-white/5 md:bg-transparent rounded-2xl md:rounded-none">
                            <span className="hidden sm:inline">
                                Exibindo items {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} de {totalItems}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-colors border border-white/5"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-xl font-black transition-all border ${currentPage === page
                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110'
                                                : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-colors border border-white/5"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <CreateMenuModal
                isOpen={isCreateMenuModalOpen}
                onClose={() => {
                    setIsCreateMenuModalOpen(false);
                    setMenuToEdit(null);
                }}
                onSuccess={fetchMenus}
                menuToEdit={menuToEdit}
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
                    menuType={selectedMenu.type || 'tradicional'}
                    menuDiscountPercent={selectedMenu.discount_percent}
                    editingItem={itemToEdit}
                />
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                variant="toast"
            />
        </main>
    );
};
