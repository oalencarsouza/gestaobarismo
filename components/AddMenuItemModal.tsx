import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { X, Save, Loader2, Package, PenLine } from 'lucide-react';
import type { Product, MenuItem, Category, MenuType } from '../types';
import { getUniqueCategories } from '../lib/data-utils';

interface AddMenuItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    menuId: string;
    menuType: MenuType;
    menuDiscountPercent?: number;
    editingItem?: MenuItem | null;
}

export const AddMenuItemModal: React.FC<AddMenuItemModalProps> = ({
    isOpen, onClose, onSuccess, menuId, menuType, menuDiscountPercent, editingItem
}) => {
    const { showSuccess, showError } = useNotification();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Mode: 'stock' = from stock, 'custom' = manual item
    const [itemMode, setItemMode] = useState<'stock' | 'custom'>('stock');

    // Stock selection states
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Custom item states
    const [customName, setCustomName] = useState('');
    const [customDescription, setCustomDescription] = useState('');

    // Price states
    const [customPrice, setCustomPrice] = useState<string>('');
    const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
    const [discountValue, setDiscountValue] = useState<string>('');

    // Fetch data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    // Setup for editing mode
    useEffect(() => {
        if (isOpen && editingItem) {
            if (editingItem.product_id && editingItem.product) {
                setItemMode('stock');
                setSelectedCategoryId(editingItem.product.category_id || '');
                setSelectedProductId(editingItem.product.id);
                setSelectedProduct(editingItem.product);
                setCustomPrice(editingItem.price.toString());

                if (editingItem.price < editingItem.product.price) {
                    setDiscountType('fixed');
                    setDiscountValue((editingItem.product.price - editingItem.price).toFixed(2));
                } else {
                    setDiscountType('none');
                    setDiscountValue('');
                }
            } else {
                setItemMode('custom');
                setCustomName(editingItem.custom_name || '');
                setCustomDescription(editingItem.custom_description || '');
                setCustomPrice(editingItem.price.toString());
            }
        } else if (isOpen && !editingItem) {
            resetForm();
        }
    }, [isOpen, editingItem]);

    const resetForm = () => {
        setItemMode('stock');
        setSelectedCategoryId('');
        setSelectedProductId('');
        setSelectedProduct(null);
        setCustomName('');
        setCustomDescription('');
        setCustomPrice('');
        setDiscountType('none');
        setDiscountValue('');
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                supabase.from('products').select('*').eq('is_active', true).order('name'),
                supabase.from('categories').select('*').order('name')
            ]);

            if (productsRes.data) setProducts(productsRes.data);
            if (categoriesRes.data) setCategories(getUniqueCategories(categoriesRes.data));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Update selected product object when ID changes
    useEffect(() => {
        if (selectedProductId) {
            const prod = products.find(p => p.id === selectedProductId);
            if (prod) {
                setSelectedProduct(prod);
                if (!editingItem || (editingItem.product?.id !== prod.id)) {
                    // Apply menu-level discount for 'desconto' type
                    if (menuType === 'desconto' && menuDiscountPercent) {
                        const discountedPrice = prod.price * (1 - menuDiscountPercent / 100);
                        setCustomPrice(Math.max(0, discountedPrice).toFixed(2));
                        setDiscountType('percent');
                        setDiscountValue(menuDiscountPercent.toString());
                    } else {
                        setCustomPrice(prod.price.toFixed(2));
                        setDiscountType('none');
                        setDiscountValue('');
                    }
                }
            }
        } else {
            setSelectedProduct(null);
            if (itemMode === 'stock') setCustomPrice('');
        }
    }, [selectedProductId, products, editingItem, menuType, menuDiscountPercent]);

    // Handle price calculation when discount changes (only for stock items & tradicional/especial)
    useEffect(() => {
        if (!selectedProduct || itemMode !== 'stock') return;
        // Don't auto-calculate if menu type is 'desconto' (already handled above)
        if (menuType === 'desconto') return;

        const originalPrice = selectedProduct.price;
        let finalPrice = originalPrice;
        const val = parseFloat(discountValue) || 0;

        if (discountType === 'percent') {
            finalPrice = originalPrice * (1 - val / 100);
        } else if (discountType === 'fixed') {
            finalPrice = originalPrice - val;
        }

        if (discountType !== 'none') {
            setCustomPrice(Math.max(0, finalPrice).toFixed(2));
        } else {
            setCustomPrice(originalPrice.toFixed(2));
        }
    }, [discountType, discountValue, selectedProduct, itemMode, menuType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (itemMode === 'stock' && !selectedProduct) {
            showError('Selecione um produto.');
            return;
        }
        if (itemMode === 'custom' && !customName.trim()) {
            showError('Informe o nome do item.');
            return;
        }
        if (!customPrice || parseFloat(customPrice) < 0) {
            showError('Informe um preço válido.');
            return;
        }

        setLoading(true);
        try {
            const payload: Record<string, unknown> = {
                menu_id: menuId,
                price: parseFloat(customPrice),
            };

            if (itemMode === 'stock' && selectedProduct) {
                payload.product_id = selectedProduct.id;
                payload.custom_name = null;
                payload.custom_description = null;
            } else {
                payload.product_id = null;
                payload.custom_name = customName.trim();
                payload.custom_description = customDescription.trim() || null;
            }

            // Check for duplicate (only for stock items on new entries)
            if (!editingItem && itemMode === 'stock' && selectedProduct) {
                const { data: existing } = await supabase
                    .from('menu_items')
                    .select('id')
                    .eq('menu_id', menuId)
                    .eq('product_id', selectedProduct.id)
                    .single();

                if (existing) {
                    showError('Este produto já está neste cardápio.');
                    setLoading(false);
                    return;
                }
            }

            if (editingItem) {
                const { error } = await supabase
                    .from('menu_items')
                    .update(payload)
                    .eq('id', editingItem.id);

                if (error) throw error;
                showSuccess('Item atualizado com sucesso!');
            } else {
                const { error } = await supabase
                    .from('menu_items')
                    .insert([payload]);

                if (error) throw error;
                showSuccess('Item adicionado ao cardápio!');
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Erro ao salvar item:', error);
            showError('Erro ao salvar item no cardápio.');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = selectedCategoryId
        ? products.filter(p => p.category_id === selectedCategoryId)
        : products;

    if (!isOpen) return null;

    const canSubmit = itemMode === 'stock'
        ? !!selectedProduct && !!customPrice
        : !!customName.trim() && !!customPrice;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background-dark border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                    <h3 className="text-xl font-bold text-white">
                        {editingItem ? 'Editar Item do Cardápio' : 'Adicionar ao Cardápio'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    {/* Item Mode Toggle */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => { setItemMode('stock'); setCustomName(''); setCustomDescription(''); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${itemMode === 'stock'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-white/10 text-gray-400 hover:bg-white/5'
                                }`}
                        >
                            <Package size={18} />
                            Do Estoque
                        </button>
                        <button
                            type="button"
                            onClick={() => { setItemMode('custom'); setSelectedProductId(''); setSelectedProduct(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${itemMode === 'custom'
                                ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                                : 'border-white/10 text-gray-400 hover:bg-white/5'
                                }`}
                        >
                            <PenLine size={18} />
                            Item Personalizado
                        </button>
                    </div>

                    {itemMode === 'stock' ? (
                        <>
                            {/* Category Selection */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-400">Filtrar por Categoria</label>
                                <select
                                    value={selectedCategoryId}
                                    onChange={e => {
                                        setSelectedCategoryId(e.target.value);
                                        if (!editingItem) setSelectedProductId('');
                                    }}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
                                >
                                    <option value="" className="bg-[#1A1614] text-gray-500">Todas as Categorias</option>
                                    {categories.filter(c => !['Lanches', 'Drinks'].includes(c.name)).map(cat => (
                                        <option key={cat.id} value={cat.id} className="bg-[#1A1614] text-white">
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Product Selection */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-400">Selecione o Produto</label>
                                <select
                                    required
                                    value={selectedProductId}
                                    onChange={e => setSelectedProductId(e.target.value)}
                                    disabled={filteredProducts.length === 0}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="" className="bg-[#1A1614] text-gray-500">Selecione um produto...</option>
                                    {filteredProducts.map(product => (
                                        <option key={product.id} value={product.id} className="bg-[#1A1614] text-white">
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                                {filteredProducts.length === 0 && selectedCategoryId && (
                                    <span className="text-xs text-red-400 ml-1">Nenhum produto cadastrado nesta categoria.</span>
                                )}
                            </div>

                            {/* Price display for stock product */}
                            {selectedProduct && (
                                <div className="space-y-6 pt-4 border-t border-white/5 animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                        <span className="text-sm text-gray-400">Preço Original (Estoque)</span>
                                        <span className="text-white font-bold font-numbers">
                                            R$ {selectedProduct.price.toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Menu-level discount badge */}
                                    {menuType === 'desconto' && menuDiscountPercent && (
                                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5">
                                            <span className="text-xs font-bold text-emerald-400">
                                                Desconto do cardápio: {menuDiscountPercent}% aplicado automaticamente
                                            </span>
                                        </div>
                                    )}

                                    {/* Quantity badge */}
                                    {menuType === 'quantidade' && (
                                        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2.5">
                                            <span className="text-xs font-bold text-blue-400">
                                                ✨ Pague 1, Leve 2 — valor mantido
                                            </span>
                                        </div>
                                    )}

                                    {/* Final Price Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Preço de Venda no Cardápio
                                        </label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-xl select-none">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={customPrice}
                                                onChange={(e) => {
                                                    setCustomPrice(e.target.value);
                                                    if (menuType !== 'desconto') {
                                                        setDiscountType('none');
                                                        setDiscountValue('');
                                                    }
                                                }}
                                                className="w-full bg-black/20 border-2 border-primary/50 rounded-xl pl-12 pr-4 py-4 text-white text-2xl font-black font-numbers focus:ring-4 focus:ring-primary/20 outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Discount Actions (only for tradicional and especial) */}
                                    {(menuType === 'tradicional' || menuType === 'especial') && (
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                Aplicar Desconto Rápido
                                            </label>
                                            <div className="flex gap-2">
                                                {['7', '10', '17'].map(pct => (
                                                    <button
                                                        key={pct}
                                                        type="button"
                                                        onClick={() => { setDiscountType('percent'); setDiscountValue(pct); }}
                                                        className={`flex-1 py-2 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/5 transition-all ${discountType === 'percent' && discountValue === pct
                                                            ? 'bg-primary/20 border-primary text-primary'
                                                            : 'text-gray-400'
                                                            }`}
                                                    >
                                                        {pct}% Off
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Custom Item Form */
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-200">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Nome do Item <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="Ex: Lanche Choripan, Drink Especial..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Descrição (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={customDescription}
                                    onChange={(e) => setCustomDescription(e.target.value)}
                                    placeholder="Descrição breve do item..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Preço <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-bold text-xl select-none">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={customPrice}
                                        onChange={(e) => setCustomPrice(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-black/20 border-2 border-purple-500/50 rounded-xl pl-12 pr-4 py-4 text-white text-2xl font-black font-numbers focus:ring-4 focus:ring-purple-500/20 outline-none transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 pt-2 border-t border-white/10 bg-background-dark flex gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !canSubmit}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Salvar Item
                    </button>
                </div>
            </div>
        </div>
    );
};
