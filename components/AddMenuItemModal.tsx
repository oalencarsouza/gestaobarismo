
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { Filter, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [customPrice, setCustomPrice] = useState<string>('');
    const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
    const [discountValue, setDiscountValue] = useState<string>('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [filterStartIndex, setFilterStartIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            if (editingItem) {
                const product = editingItem.product;
                setSelectedProduct(product || null);
                setCustomPrice(editingItem.price.toString());

                // Se o preço for diferente do original, interpretamos como desconto fixo no estado local
                if (product && editingItem.price !== product.price) {
                    setDiscountType('fixed');
                    setDiscountValue((product.price - editingItem.price).toFixed(2));
                } else {
                    setDiscountType('none');
                    setDiscountValue('');
                }
            }
        }
    }, [isOpen, editingItem]);

    // Handle price calculation when discount changes
    useEffect(() => {
        if (!selectedProduct) return;

        const originalPrice = selectedProduct.price;
        let newPrice = originalPrice;
        const val = parseFloat(discountValue) || 0;

        if (discountType === 'percent') {
            newPrice = originalPrice * (1 - val / 100);
        } else if (discountType === 'fixed') {
            newPrice = originalPrice - val;
        }

        // Se o tipo for 'none', forçamos o preço original e não permitimos edição manual
        if (discountType === 'none') {
            setCustomPrice(originalPrice.toFixed(2));
        } else {
            setCustomPrice(Math.max(0, newPrice).toFixed(2));
        }
    }, [discountType, discountValue, selectedProduct]);

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

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setCustomPrice(product.price.toString());
        setDiscountType('none');
        setDiscountValue('');
    };

    const handleSelectCategory = (categoryId: string | null) => {
        const allFilters = [{ id: null, name: 'Todas' }, ...categories];
        const index = allFilters.findIndex(f => (f.id === categoryId) || (f.id === null && categoryId === null));

        // Try to center the selected category or at least make it visible
        const newStart = Math.max(0, Math.min(allFilters.length - 3, index));
        setFilterStartIndex(newStart);

        setSelectedCategoryId(categoryId);
        setShowResults(true);
        setSearchTerm('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        setLoading(true);
        try {
            if (editingItem) {
                const { error } = await supabase
                    .from('menu_items')
                    .update({
                        price: parseFloat(customPrice)
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
            handleClose();
        } catch (error) {
            console.error('Erro ao salvar item:', error);
            showError('Erro ao salvar item no cardápio.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedProduct(null);
        setCustomPrice('');
        setDiscountType('none');
        setDiscountValue('');
        setSearchTerm('');
        setSelectedCategoryId(null);
        setShowResults(false);
        onClose();
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategoryId || p.category_id === selectedCategoryId;
        return matchesSearch && matchesCategory;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1e140f] rounded-xl shadow-2xl w-full max-w-2xl border border-white/10 max-h-[92vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">
                        {editingItem ? 'Editar Item do Cardápio' : 'Adicionar Item ao Cardápio'}
                    </h2>
                </div>

                <div className="p-5 flex-1 overflow-y-auto space-y-5 scrollbar-none">
                    {/* Product Selection */}
                    {/* Product Selection */}
                    {!selectedProduct ? (
                        <div className="space-y-4">
                            {!showResults ? (
                                <div className="space-y-4">
                                    <p className="text-gray-400 text-xs font-medium text-center opacity-70">Selecione uma categoria para começar</p>
                                    <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto">
                                        {/* Todas button */}
                                        <button
                                            onClick={() => handleSelectCategory(null)}
                                            className={`group p-4 rounded-xl border transition-all text-sm font-bold flex flex-col items-center justify-center gap-2 aspect-[4/3] ${!selectedCategoryId ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:border-primary/30 hover:bg-white/10'}`}
                                        >
                                            <Filter size={24} className={!selectedCategoryId ? 'text-white' : 'text-primary/70 group-hover:text-primary'} />
                                            Todas
                                        </button>

                                        {/* Dynamic categories */}
                                        {categories.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => handleSelectCategory(cat.id)}
                                                className="group p-4 rounded-xl border bg-white/5 border-white/10 text-gray-300 hover:border-primary/30 hover:bg-white/10 transition-all text-sm font-bold flex flex-col items-center justify-center gap-2 aspect-[4/3]"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform font-bold text-xs">
                                                    {cat.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="truncate w-full text-center leading-tight">
                                                    {cat.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setShowResults(false)}
                                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Filter size={18} />
                                        </button>
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                            <input
                                                type="text"
                                                placeholder="Buscar produto..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* Category Filter Pills (Limited to 3 with arrows) */}
                                    <div className="flex items-center gap-2 py-1">
                                        <button
                                            disabled={filterStartIndex === 0}
                                            onClick={() => setFilterStartIndex(prev => Math.max(0, prev - 1))}
                                            className="p-1.5 rounded-full bg-white/5 border border-white/10 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>

                                        <div className="flex-1 flex gap-2 overflow-hidden">
                                            {[{ id: null, name: 'Todas' }, ...categories].slice(filterStartIndex, filterStartIndex + 3).map(cat => (
                                                <button
                                                    key={cat.id ?? 'all'}
                                                    onClick={() => setSelectedCategoryId(cat.id)}
                                                    className={`flex-1 px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider font-black transition-all border whitespace-nowrap truncate ${selectedCategoryId === cat.id ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'}`}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            disabled={filterStartIndex >= ([{ id: null, name: 'Todas' }, ...categories].length - 3)}
                                            onClick={() => setFilterStartIndex(prev => Math.min(([{ id: null, name: 'Todas' }, ...categories].length - 3), prev + 1))}
                                            className="p-1.5 rounded-full bg-white/5 border border-white/10 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                                        {filteredProducts.map(product => (
                                            <div
                                                key={product.id}
                                                onClick={() => handleSelectProduct(product)}
                                                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-primary/30"
                                            >
                                                <span className="text-white font-medium">{product.name}</span>
                                                <span className="text-primary font-bold font-numbers">R$ {product.price.toFixed(2)}</span>
                                            </div>
                                        ))}
                                        {filteredProducts.length === 0 && (
                                            <div className="text-center py-8 text-gray-500">
                                                Nenhum produto encontrado nesta categoria.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                                <p className="text-sm text-gray-400 mb-1">Produto Selecionado</p>
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-white">{selectedProduct.name}</h3>
                                    {!editingItem && (
                                        <button
                                            onClick={() => setSelectedProduct(null)}
                                            className="text-xs text-primary hover:underline font-bold"
                                        >
                                            Trocar produto
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-gray-400 mt-2 font-numbers font-medium tracking-wide">
                                    Preço Original: R$ {selectedProduct.price.toFixed(2)}
                                </p>
                            </div>

                            {/* Discount Options */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-400">
                                    Aplicar Desconto (Opcional)
                                </label>
                                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 w-full lg:w-fit">
                                    <button
                                        type="button"
                                        onClick={() => { setDiscountType('none'); setDiscountValue(''); }}
                                        className={`flex-1 lg:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${discountType === 'none' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Nenhum
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDiscountType('percent')}
                                        className={`flex-1 lg:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${discountType === 'percent' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Porcentagem (%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDiscountType('fixed')}
                                        className={`flex-1 lg:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${discountType === 'fixed' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Valor Fixo (R$)
                                    </button>
                                </div>

                                {discountType !== 'none' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <input
                                            type="number"
                                            value={discountValue}
                                            onChange={(e) => setDiscountValue(e.target.value)}
                                            placeholder={discountType === 'percent' ? "Ex: 10 para 10%" : "Ex: 5.00 para R$ 5,00"}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-numbers focus:ring-2 focus:ring-primary outline-none"
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Preço no Cardápio (Final)
                                </label>
                                <div className={`relative group ${discountType === 'none' ? 'opacity-60' : ''}`}>
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-xl select-none">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={customPrice}
                                        disabled={discountType === 'none'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCustomPrice(val);

                                            // Atualiza o valor do desconto se estiver em modo 'fixed'
                                            if (discountType === 'fixed' && selectedProduct) {
                                                const deduction = selectedProduct.price - parseFloat(val);
                                                setDiscountValue(isNaN(deduction) ? '' : deduction.toFixed(2));
                                            }
                                        }}
                                        className={`w-full bg-white/5 border-2 ${discountType === 'none' ? 'border-primary/10' : 'border-primary/30 group-hover:border-primary'} rounded-xl pl-12 pr-4 py-4 text-white text-2xl font-black font-numbers focus:ring-4 focus:ring-primary/20 outline-none transition-all shadow-inner ${discountType === 'none' ? 'cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {discountType === 'none'
                                        ? "O preço final é o preço original do produto. Selecione um tipo de desconto para ajustar."
                                        : "Você pode ajustar o preço final livremente acima."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    {selectedProduct && !editingItem && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !customPrice}
                            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            Adicionar ao Cardápio
                        </button>
                    )}
                    {selectedProduct && editingItem && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !customPrice}
                            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-all disabled:opacity-50 font-bold"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            Salvar Alterações
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
