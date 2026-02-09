import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { X, Save, Loader2 } from 'lucide-react';
import type { Product, MenuItem, Category } from '../types';
import { getUniqueCategories } from '../lib/data-utils';

interface AddMenuItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    menuId: string;
    editingItem?: MenuItem | null;
}

export const AddMenuItemModal: React.FC<AddMenuItemModalProps> = ({ isOpen, onClose, onSuccess, menuId, editingItem }) => {
    const { showSuccess, showError } = useNotification();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Selection States
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Form States
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
            const product = editingItem.product;
            if (product) {
                // Determine category if possible
                setSelectedCategoryId(product.category_id || '');
                setSelectedProductId(product.id);
                setSelectedProduct(product);
                setCustomPrice(editingItem.price.toString());

                // Determine discount state by comparing stored price vs original product price
                // Note: This is an estimation since we don't store discount metadata, only final price
                if (editingItem.price < product.price) {
                    setDiscountType('fixed');
                    setDiscountValue((product.price - editingItem.price).toFixed(2));
                } else {
                    setDiscountType('none');
                    setDiscountValue('');
                }
            }
        } else if (isOpen && !editingItem) {
            // Reset states for new item
            setSelectedCategoryId('');
            setSelectedProductId('');
            setSelectedProduct(null);
            setCustomPrice('');
            setDiscountType('none');
            setDiscountValue('');
        }
    }, [isOpen, editingItem]);

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
                // If we are strictly changing product (not initializing edit), reset price
                if (!editingItem || (editingItem.product.id !== prod.id)) {
                    setCustomPrice(prod.price.toFixed(2));
                    setDiscountType('none');
                    setDiscountValue('');
                }
            }
        } else {
            setSelectedProduct(null);
            setCustomPrice('');
        }
    }, [selectedProductId, products, editingItem]);

    // Handle price calculation when discount changes
    useEffect(() => {
        if (!selectedProduct) return;

        const originalPrice = selectedProduct.price;
        let finalPrice = originalPrice;
        const val = parseFloat(discountValue) || 0;

        if (discountType === 'percent') {
            finalPrice = originalPrice * (1 - val / 100);
        } else if (discountType === 'fixed') {
            finalPrice = originalPrice - val;
        }

        // Only update customPrice if the calculation differs significantly or if user just changed discount type
        // to avoid fighting with user input on 'fixed' mode, but 'percent' mode is strict.
        if (discountType !== 'none') {
            setCustomPrice(Math.max(0, finalPrice).toFixed(2));
        } else {
            setCustomPrice(originalPrice.toFixed(2));
        }
    }, [discountType, discountValue, selectedProduct]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        setLoading(true);
        try {
            // Check if item already exists in this menu (only for new items)
            if (!editingItem) {
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
                    .update({
                        price: parseFloat(customPrice),
                        product_id: selectedProduct.id // Allow changing product
                    })
                    .eq('id', editingItem.id);

                if (error) throw error;
                showSuccess('Item atualizado com sucesso!');
            } else {
                const { error } = await supabase
                    .from('menu_items')
                    .insert([{
                        menu_id: menuId,
                        product_id: selectedProduct.id,
                        price: parseFloat(customPrice)
                    }]);

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
                            {categories.map(cat => (
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

                    {/* Price & Discount Configuration */}
                    {selectedProduct && (
                        <div className="space-y-6 pt-4 border-t border-white/5 animate-in slide-in-from-bottom-2 duration-300">

                            {/* Original Price Display */}
                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-sm text-gray-400">Preço Original (Estoque)</span>
                                <span className="text-white font-bold font-numbers">
                                    R$ {selectedProduct.price.toFixed(2)}
                                </span>
                            </div>

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
                                            setDiscountType('none'); // Manual override resets discount logic visual
                                            setDiscountValue('');
                                        }}
                                        className="w-full bg-black/20 border-2 border-primary/50 rounded-xl pl-12 pr-4 py-4 text-white text-2xl font-black font-numbers focus:ring-4 focus:ring-primary/20 outline-none transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Discount Quick Actions */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Aplicar Desconto Rápido
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDiscountType('percent');
                                            setDiscountValue('10');
                                        }}
                                        className={`flex-1 py-2 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/5 transition-all ${discountType === 'percent' && discountValue === '10' ? 'bg-primary/20 border-primary text-primary' : 'text-gray-400'}`}
                                    >
                                        10% Off
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDiscountType('percent');
                                            setDiscountValue('20');
                                        }}
                                        className={`flex-1 py-2 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/5 transition-all ${discountType === 'percent' && discountValue === '20' ? 'bg-primary/20 border-primary text-primary' : 'text-gray-400'}`}
                                    >
                                        20% Off
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDiscountType('percent');
                                            setDiscountValue('50');
                                        }}
                                        className={`flex-1 py-2 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/5 transition-all ${discountType === 'percent' && discountValue === '50' ? 'bg-primary/20 border-primary text-primary' : 'text-gray-400'}`}
                                    >
                                        50% Off
                                    </button>
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
                        disabled={loading || !selectedProduct}
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
