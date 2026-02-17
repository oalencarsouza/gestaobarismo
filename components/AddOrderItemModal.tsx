
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { X, ChevronLeft, Loader2, Plus, Minus, ShoppingCart, Coffee, Percent, Copy, Sparkles } from 'lucide-react';
import type { Menu, MenuItem, MenuType } from '../types';

const TYPE_CONFIG: Record<MenuType, { label: string; color: string; icon: React.ReactNode; badge?: string; badgeColor?: string }> = {
    tradicional: { label: 'Tradicional', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', icon: <Coffee size={14} /> },
    desconto: { label: 'Desconto', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <Percent size={14} />, badge: 'Com desconto!', badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    quantidade: { label: 'Pague 1 Leve 2', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: <Copy size={14} />, badge: 'Em dobro!', badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    especial: { label: 'Especial', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: <Sparkles size={14} />, badge: 'Especial!', badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
};

interface AddOrderItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemsAdded: () => void;
    orderId: string;
}

interface CartItem {
    menuItemId: string;
    menuId: string;
    productName: string;
    price: number;
    quantity: number;
    menuType: MenuType;
    menuName: string;
}

export const AddOrderItemModal: React.FC<AddOrderItemModalProps> = ({
    isOpen, onClose, onItemsAdded, orderId
}) => {
    const { showSuccess, showError } = useNotification();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [menus, setMenus] = useState<Menu[]>([]);
    const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchMenus();
            setSelectedMenu(null);
            setMenuItems([]);
            setCart([]);
        }
    }, [isOpen]);

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
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('menu_items')
                .select('*, product:products(*)')
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

    const getItemName = (item: MenuItem): string => {
        if (item.product_id && item.product) return item.product.name;
        return item.custom_name || 'Item sem nome';
    };

    const addToCart = (item: MenuItem) => {
        if (!selectedMenu) return;
        const name = getItemName(item);

        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === item.id);
            if (existing) {
                return prev.map(c =>
                    c.menuItemId === item.id
                        ? { ...c, quantity: c.quantity + 1 }
                        : c
                );
            }
            return [...prev, {
                menuItemId: item.id,
                menuId: selectedMenu.id,
                productName: name,
                price: item.price,
                quantity: 1,
                menuType: selectedMenu.type || 'tradicional',
                menuName: selectedMenu.name,
            }];
        });
    };

    const removeFromCart = (menuItemId: string) => {
        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === menuItemId);
            if (existing && existing.quantity > 1) {
                return prev.map(c =>
                    c.menuItemId === menuItemId
                        ? { ...c, quantity: c.quantity - 1 }
                        : c
                );
            }
            return prev.filter(c => c.menuItemId !== menuItemId);
        });
    };

    const getCartQty = (menuItemId: string): number => {
        return cart.find(c => c.menuItemId === menuItemId)?.quantity || 0;
    };

    const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
    const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

    const handleConfirm = async () => {
        if (cart.length === 0) return;
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
            onItemsAdded();
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
                {config.label}
                {menu.type === 'desconto' && menu.discount_percent ? ` ${menu.discount_percent}%` : ''}
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
                            {selectedMenu ? selectedMenu.name : 'Selecione o Cardápio'}
                        </h3>
                        {selectedMenu && getTypeBadge(selectedMenu)}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-primary" size={40} />
                        </div>
                    ) : !selectedMenu ? (
                        /* Step 1: Menu Selection */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {menus.map(menu => (
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
                            ))}
                            {menus.length === 0 && (
                                <div className="col-span-full py-20 text-center text-gray-500">
                                    Nenhum cardápio ativo encontrado.
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Step 2: Item Selection */
                        <div className="flex flex-col gap-3">
                            {menuItems.map(item => {
                                const name = getItemName(item);
                                const qty = getCartQty(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${qty > 0 ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'}`}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="text-white font-medium">{name}</span>
                                            <span className="text-primary font-bold font-numbers text-lg">R$ {item.price.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
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
                            {menuItems.length === 0 && (
                                <div className="py-20 text-center text-gray-500">
                                    Nenhum item neste cardápio.
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
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <ShoppingCart size={20} />}
                            Adicionar ao Pedido
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
