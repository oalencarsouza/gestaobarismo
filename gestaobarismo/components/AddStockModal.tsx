import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { Product, Category } from '../types';

interface AddStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productId: string, quantityToAdd: number) => void;
    categories: Category[];
    products: Product[];
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
    isOpen,
    onClose,
    onSave,
    categories,
    products
}) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
    const [currentStock, setCurrentStock] = useState<number>(0);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedCategoryId('');
            setSelectedProductId('');
            setQuantityToAdd(1);
            setCurrentStock(0);
        }
    }, [isOpen]);

    // Update current stock when product is selected
    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            setCurrentStock(product?.stock?.quantity || 0);
        } else {
            setCurrentStock(0);
        }
    }, [selectedProductId, products]);

    const filteredProducts = selectedCategoryId
        ? products.filter(p => p.category_id === selectedCategoryId)
        : products;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedProductId && quantityToAdd > 0) {
            onSave(selectedProductId, quantityToAdd);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background-dark border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h3 className="text-xl font-bold text-white">Adicionar Estoque</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
                    {/* Category Selection */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-400">Filtrar por Categoria</label>
                        <select
                            value={selectedCategoryId}
                            onChange={e => {
                                setSelectedCategoryId(e.target.value);
                                setSelectedProductId(''); // Reset product when category changes
                            }}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-[#1A1614]">Todas as Categorias</option>
                            {[...new Set(categories.map(c => c.name))].map(catName => {
                                const cat = categories.find(c => c.name === catName);
                                return (
                                    <option key={cat?.id} value={cat?.id} className="bg-[#1A1614]">
                                        {cat?.name}
                                    </option>
                                );
                            })}
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
                            <option value="" className="bg-[#1A1614]">Selecione um produto...</option>
                            {filteredProducts.map(product => (
                                <option key={product.id} value={product.id} className="bg-[#1A1614]">
                                    {product.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Stock Info & Quantity Input */}
                    {selectedProductId && (
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between">
                            <div>
                                <span className="text-sm text-gray-400 block mb-1">Estoque Atual</span>
                                <span className="text-2xl font-bold text-white">{currentStock}</span>
                                <span className="text-xs text-gray-500 ml-1">unidades</span>
                            </div>
                            <div className="w-px h-10 bg-white/10 mx-4"></div>
                            <div className="flex flex-col gap-1 w-32">
                                <label className="text-xs font-bold text-primary uppercase">Adicionar</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={quantityToAdd}
                                    onChange={e => setQuantityToAdd(parseInt(e.target.value) || 0)}
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-right font-bold focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                            <div className="w-px h-10 bg-white/10 mx-4"></div>
                            <div>
                                <span className="text-sm text-gray-400 block mb-1">Novo Total</span>
                                <span className="text-2xl font-bold text-green-500">{currentStock + quantityToAdd}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!selectedProductId || quantityToAdd <= 0}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={20} />
                            Salvar Estoque
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
