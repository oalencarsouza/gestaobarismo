
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { X, ChevronLeft, ChevronRight, Loader2, Plus, Minus, ShoppingCart, Coffee, Percent, Copy, Sparkles, ArrowRight, Search, Filter } from 'lucide-react';
import type { Menu, MenuItem, MenuType, CartItem, Category } from '../types';

const TYPE_CONFIG: Record<MenuType, { label: string; color: string; icon: React.ReactNode; badge?: string; badgeColor?: string }> = {
    tradicional: { label: 'Tradicional', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', icon: <Coffee size={14} /> },
    desconto: { label: 'Desconto', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <Percent size={14} />, badge: 'Com desconto!', badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    quantidade: { label: 'Pague 1 Leve 2', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: <Copy size={14} />, badge: 'Em dobro!', badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    especial: { label: 'Especial', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: <Sparkles size={14} />, badge: 'Especial!', badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
};

interface AddOrderItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemsAdded?: () => void;
    onCartConfirmed?: (items: CartItem[]) => void;
    orderId?: string;
}

export const AddOrderItemModal: React.FC<AddOrderItemModalProps> = ({
    isOpen, onClose, onItemsAdded, onCartConfirmed, orderId
}) => {
    const { showSuccess, showError } = useNotification();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [menus, setMenus] = useState<Menu[]>([]);
    const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [isGlobalSearch, setIsGlobalSearch] = useState(false);
    const [globalResults, setGlobalResults] = useState<any[]>([]);
    const [filterSlideIndex, setFilterSlideIndex] = useState(0);
    const [menuSlideIndex, setMenuSlideIndex] = useState(0);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchMenus();
            fetchCategories();
            setSelectedMenu(null);
            setMenuItems([]);
            setCart([]);
            setSearchTerm('');
            setSelectedCategoryId(null);
            setIsGlobalSearch(false);
        }
    }, [isOpen]);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');
            if (error) throw error;

            // Ensure unique categories by name to prevent duplicates in the UI
            const uniqueCategories = (data || []).reduce((acc: Category[], current) => {
                const x = acc.find(item => item.name === current.name);
                if (!x) {
                    return acc.concat([current]);
                } else {
                    return acc;
                }
            }, []);

            setCategories(uniqueCategories);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchMenus = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('menus')
                .select('*')
                .eq('active', true)
                .order('name');

            if (error) throw error;
            setMenus(data || []);
        } catch (error) {
            console.error('Erro ao buscar cardápios:', error);
            showError('Não foi possível carregar os cardápios.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectMenu = async (menu: Menu) => {
        setSelectedMenu(menu);
        setSearchTerm('');
        setSelectedCategoryId(null);
        setIsGlobalSearch(false);
        setFilterSlideIndex(0); // Reset filter slide
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('menu_items')
                .select('*, product:products(*, stock(*), category:categories(*))')
                .eq('menu_id', menu.id);

            if (error) throw error;
            setMenuItems(data || []);
        } catch (error) {
            console.error('Erro ao buscar itens:', error);
            showError('Não foi possível carregar os itens do cardápio.');
        } finally {
            setLoading(false);
        }
    };

    const handleGlobalSearch = async (term: string) => {
        if (term.length < 2) {
            setIsGlobalSearch(false);
            setGlobalResults([]);
            return;
        }

        setIsGlobalSearch(true);
        setLoading(true);
        try {
            // Search menu items across all active menus
            // We join products and menus to get full info and ensure menu is active
            const { data, error } = await supabase
                .from('menu_items')
                .select(`
                    *,
                    product:products!inner(*, stock(*), category:categories(*)),
                    menu:menus!inner(*)
                `)
                .eq('menu.active', true)
                .ilike('product.name', `%${term}%`);

            if (error) throw error;

            // Adjust the structure to match what the component expects
            // We also need to fetch custom items that don't have product_id but match name
            const { data: customData, error: customError } = await supabase
                .from('menu_items')
                .select(`
                    *,
                    menu:menus!inner(*)
                `)
                .eq('menu.active', true)
                .is('product_id', null)
                .ilike('custom_name', `%${term}%`);

            if (customError) throw customError;

            setGlobalResults([...(data || []), ...(customData || [])]);
        } catch (error) {
            console.error('Error in global search:', error);
        } finally {
            setLoading(false);
        }
    };

    const getItemName = (item: MenuItem | any): string => {
        if (item.product_id && item.product) return item.product.name;
        return item.custom_name || 'Item sem nome';
    };

    const displayedItems = useMemo(() => {
        let items = isGlobalSearch ? globalResults : menuItems;

        if (searchTerm && !isGlobalSearch) {
            items = items.filter(item =>
                getItemName(item).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedCategoryId) {
            items = items.filter(item => item.product?.category_id === selectedCategoryId);
        }

        return items;
    }, [isGlobalSearch, globalResults, menuItems, searchTerm, selectedCategoryId]);

    const addToCart = (item: MenuItem | any) => {
        const targetMenu = isGlobalSearch ? item.menu : selectedMenu;
        if (!targetMenu) return;

        const name = getItemName(item);
        const currentQty = getCartQty(item.id);
        const increment = targetMenu.type === 'quantidade' ? 2 : 1;

        // Validation: Stock availability
        if (item.product_id && item.product) {
            const stockQty = item.product.stock?.quantity || 0;
            if (currentQty + increment > stockQty) {
                showError(`Estoque insuficiente de "${name}". Disponível: ${stockQty}`);
                return;
            }
        }

        // Validation: Custom item limit
        if (!item.product_id) {
            if (currentQty + increment > 99) {
                showError('Limite de 99 unidades para itens personalizados atingido.');
                return;
            }
        }

        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === item.id);
            if (existing) {
                return prev.map(c =>
                    c.menuItemId === item.id
                        ? { ...c, quantity: c.quantity + increment }
                        : c
                );
            }
            return [...prev, {
                menuItemId: item.id,
                menuId: targetMenu.id,
                productName: name,
                price: item.price,
                quantity: increment,
                menuType: targetMenu.type || 'tradicional',
                menuName: targetMenu.name,
            }];
        });
    };

    const removeFromCart = (menuItemId: string) => {
        const itemInCart = cart.find(c => c.menuItemId === menuItemId);
        if (!itemInCart) return;

        const decrement = itemInCart.menuType === 'quantidade' ? 2 : 1;

        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === menuItemId);
            if (existing && existing.quantity > decrement) {
                return prev.map(c =>
                    c.menuItemId === menuItemId
                        ? { ...c, quantity: c.quantity - decrement }
                        : c
                );
            }
            return prev.filter(c => c.menuItemId !== menuItemId);
        });
    };

    const getCartQty = (menuItemId: string): number => {
        return cart.find(c => c.menuItemId === menuItemId)?.quantity || 0;
    };

    const cartTotal = cart.reduce((sum, c) => {
        if (c.menuType === 'quantidade') {
            // "Pague 1 Leve 2" logic: charge half of the quantity
            return sum + (c.price * (c.quantity / 2));
        }
        return sum + (c.price * c.quantity);
    }, 0);
    const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

    const handleConfirm = async () => {
        if (cart.length === 0) return;

        // If no orderId is provided, we are in "Cart Mode" (New Order Flow)
        if (!orderId) {
            if (onCartConfirmed) {
                onCartConfirmed(cart);
                onClose();
            }
            return;
        }

        // Existing logic for adding to an existing order
        setSaving(true);
        try {
            const items = cart.map(c => ({
                order_id: orderId,
                menu_id: c.menuId,
                menu_item_id: c.menuItemId,
                product_name: c.productName,
                price: c.price,
                quantity: c.quantity,
                menu_type: c.menuType,
                menu_name: c.menuName,
            }));

            const { error: insertError } = await supabase
                .from('order_items')
                .insert(items);

            if (insertError) throw insertError;

            // Recalculate order total
            const { data: allItems, error: fetchError } = await supabase
                .from('order_items')
                .select('price, quantity')
                .eq('order_id', orderId);

            if (fetchError) throw fetchError;

            const newTotal = (allItems || []).reduce(
                (sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity,
                0
            );

            const { error: updateError } = await supabase
                .from('orders')
                .update({ total: newTotal, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (updateError) throw updateError;

            showSuccess(`${cartCount} item(ns) adicionado(s) ao pedido!`);
            if (onItemsAdded) onItemsAdded();
            onClose();
        } catch (error) {
            console.error('Erro ao adicionar itens:', error);
            showError('Erro ao adicionar itens ao pedido.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const getTypeBadge = (menu: Menu) => {
        const config = TYPE_CONFIG[menu.type || 'tradicional'];
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.color}`}>
                {config.icon}
                <span className="sm:hidden font-black">
                    {menu.type === 'quantidade' ? '1 = 2 !' : menu.type === 'desconto' ? `${menu.discount_percent}%` : config.label}
                </span>
                <span className="hidden sm:inline">
                    {config.label}
                    {menu.type === 'desconto' && menu.discount_percent ? ` ${menu.discount_percent}%` : ''}
                </span>
            </span>
        );
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background-dark border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        {selectedMenu && (
                            <button
                                onClick={() => { setSelectedMenu(null); setMenuItems([]); }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <h3 className="text-xl font-bold text-white">
                            {selectedMenu
                                ? (isMobile ? TYPE_CONFIG[selectedMenu.type || 'tradicional'].label : selectedMenu.name)
                                : 'Selecione o Cardápio'}
                        </h3>
                        {selectedMenu && getTypeBadge(selectedMenu)}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Search and Filters Bar - Only visible when a menu is selected OR when searching */}
                {(selectedMenu || searchTerm.length > 0) && (
                    <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex flex-col gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder={selectedMenu ? "Pesquisar neste cardápio..." : "Pesquisar itens em todos os cardápios..."}
                                value={searchTerm}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSearchTerm(val);
                                    if (!selectedMenu) {
                                        handleGlobalSearch(val);
                                    }
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm"
                            />
                        </div>

                        {/* Category Filter Chips */}
                        {(selectedMenu || isGlobalSearch) && categories.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setFilterSlideIndex(prev => Math.max(0, prev - 1))}
                                    disabled={filterSlideIndex === 0}
                                    className="sm:hidden size-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 disabled:opacity-20 transition-all shrink-0"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    <Filter size={14} className="text-gray-500 shrink-0" />
                                    {(() => {
                                        const allOptions = [
                                            { id: null, name: 'todos' },
                                            ...categories.map(c => ({ id: c.id, name: c.name.toLowerCase() }))
                                        ];

                                        const visibleOptions = isMobile
                                            ? allOptions.slice(filterSlideIndex, filterSlideIndex + 2)
                                            : allOptions;

                                        return visibleOptions.map(opt => (
                                            <button
                                                key={opt.id ?? 'all'}
                                                onClick={() => setSelectedCategoryId(opt.id)}
                                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex-1 sm:flex-none text-center ${(opt.id === selectedCategoryId || (!opt.id && !selectedCategoryId))
                                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                                    }`}
                                            >
                                                {opt.name}
                                            </button>
                                        ));
                                    })()}
                                </div>

                                <button
                                    onClick={() => {
                                        const count = 1 + categories.length;
                                        setFilterSlideIndex(prev => Math.min(count - 2, prev + 1));
                                    }}
                                    disabled={filterSlideIndex >= (1 + categories.length) - 2}
                                    className="sm:hidden size-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 disabled:opacity-20 transition-all shrink-0"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-primary" size={40} />
                        </div>
                    ) : !selectedMenu && !isGlobalSearch ? (
                        /* Step 1: Menu Selection */
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(() => {
                                    const visibleMenus = isMobile
                                        ? menus.slice(menuSlideIndex, menuSlideIndex + 2)
                                        : menus;

                                    return visibleMenus.map(menu => (
                                        <button
                                            key={menu.id}
                                            onClick={() => handleSelectMenu(menu)}
                                            className="group p-5 rounded-xl border border-white/10 bg-white/5 hover:border-primary/50 transition-all text-left flex flex-col gap-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-white font-bold text-lg group-hover:text-primary transition-colors truncate">{menu.name}</h4>
                                            </div>
                                            <p className="text-gray-400 text-sm line-clamp-2">{menu.description || 'Sem descrição'}</p>
                                            {getTypeBadge(menu)}
                                        </button>
                                    ));
                                })()}
                                {menus.length === 0 && (
                                    <div className="col-span-full py-20 text-center text-gray-500">
                                        Nenhum cardápio ativo encontrado.
                                    </div>
                                )}
                            </div>

                            {/* Mobile Navigation for Menus */}
                            {isMobile && menus.length > 2 && (
                                <div className="flex items-center justify-center gap-4 mt-2">
                                    <button
                                        onClick={() => setMenuSlideIndex(prev => Math.max(0, prev - 1))}
                                        disabled={menuSlideIndex === 0}
                                        className="size-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 disabled:opacity-20 transition-all"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        {Math.floor(menuSlideIndex / 2) + 1} / {Math.ceil(menus.length / 2)}
                                    </span>
                                    <button
                                        onClick={() => setMenuSlideIndex(prev => Math.min(menus.length - 2, prev + 1))}
                                        disabled={menuSlideIndex >= menus.length - 2}
                                        className="size-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 disabled:opacity-20 transition-all"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Step 2: Item Selection (Filtered or Menu-based) */
                        <div className="flex flex-col gap-3">
                            {isGlobalSearch && (
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Resultado da pesquisa global</span>
                                </div>
                            )}
                            {displayedItems.map(item => {
                                const name = getItemName(item);
                                const qty = getCartQty(item.id);
                                const itemMenu = isGlobalSearch ? item.menu : selectedMenu;
                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${qty > 0 ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'}`}
                                    >
                                        <div className="flex flex-col gap-1 flex-1 min-w-0 mr-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-medium truncate">{name}</span>
                                                {isGlobalSearch && itemMenu && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-white/10 font-bold uppercase truncate max-w-[100px]">
                                                        {itemMenu.name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-primary font-bold font-numbers text-lg">R$ {item.price.toFixed(2)}</span>
                                                {item.product && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${(item.product.stock?.quantity || 0) > 0
                                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                        Estoque: {item.product.stock?.quantity ?? 0} {item.product.stock?.unit || ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {qty > 0 && (
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="size-9 rounded-lg bg-white/10 hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition-all"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                            )}
                                            {qty > 0 && (
                                                <span className="text-white font-bold text-lg w-8 text-center font-numbers">{qty}</span>
                                            )}
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="size-9 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-all"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {displayedItems.length === 0 && (
                                <div className="py-20 text-center text-gray-500 flex flex-col items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl opacity-20">inventory_2</span>
                                    <p>Nenhum item encontrado.</p>
                                    {isGlobalSearch && (
                                        <button
                                            onClick={() => { setSearchTerm(''); setIsGlobalSearch(false); }}
                                            className="text-primary text-xs font-bold uppercase hover:underline"
                                        >
                                            Ver todos os cardápios
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer / Cart Summary */}
                {cart.length > 0 && (
                    <div className="p-6 pt-4 border-t border-white/10 bg-background-dark shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-gray-400">
                                <ShoppingCart size={18} />
                                <span className="text-sm font-bold">{cartCount} item(ns)</span>
                            </div>
                            <span className="text-primary font-black text-xl font-numbers">
                                R$ {cartTotal.toFixed(2)}
                            </span>
                        </div>
                        <button
                            onClick={handleConfirm}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : (orderId ? <ShoppingCart size={20} /> : <ArrowRight size={20} />)}
                            {orderId ? 'Adicionar ao Pedido' : 'Avançar p/ Cliente'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
