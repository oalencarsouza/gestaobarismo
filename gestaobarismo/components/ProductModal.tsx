import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Product, Category } from '../types';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Partial<Product> & { quantity: number; min_quantity: number; unit: string }) => void;
    categories: Category[];
    initialData?: Product;
}

export const ProductModal: React.FC<ProductModalProps> = ({
    isOpen,
    onClose,
    onSave,
    categories,
    initialData
}) => {
    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        price: 0,
        cost_price: 0,
        description: '',
        quantity: 0,
        min_quantity: 5,
        unit: 'un'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                category_id: initialData.category_id || '',
                price: initialData.price,
                cost_price: initialData.cost_price || 0,
                description: initialData.description || '',
                quantity: initialData.stock?.quantity || 0,
                min_quantity: initialData.stock?.min_quantity || 5,
                unit: initialData.stock?.unit || 'un'
            });
        } else {
            setFormData({
                name: '',
                category_id: categories[0]?.id || '',
                price: 0,
                cost_price: 0,
                description: '',
                quantity: 0,
                min_quantity: 5,
                unit: 'un'
            });
        }
    }, [initialData, categories, isOpen]);

    const uniqueCategories = categories.reduce((acc, current) => {
        const x = acc.find(item => item.name === current.name);
        if (!x) {
            return acc.concat([current]);
        } else {
            return acc;
        }
    }, [] as Category[]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...initialData,
            ...formData,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background-dark border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h3 className="text-xl font-bold text-white">
                        {initialData ? 'Editar Produto' : 'Novo Produto'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-400">Nome do Produto</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                            placeholder="Ex: Vodka Absolut 1L"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-400">Descrição (Opcional)</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                            placeholder="Ex: Detalhes do produto..."
                        />
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">Categoria</label>
                            <select
                                value={formData.category_id}
                                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
                            >
                                {uniqueCategories.map(cat => (
                                    <option key={cat.id} value={cat.id} className="bg-[#1A1614] text-white">
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">Preço de Venda (R$)</label>
                            <input
                                required
                                type="number"
                                step="0.50"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">Preço Custo (R$) (Opcional)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.cost_price === 0 ? '' : formData.cost_price}
                                onChange={e => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2 text-primary">
                            <label className="text-sm font-medium text-gray-400">Qtd. Atual</label>
                            <input
                                required
                                type="number"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">Qtd. Mínima</label>
                            <input
                                required
                                type="number"
                                value={formData.min_quantity}
                                onChange={e => setFormData({ ...formData, min_quantity: parseInt(e.target.value) })}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">Unidade</label>
                            <select
                                value={formData.unit}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
                            >
                                <option value="un" className="bg-[#1A1614] text-white">Unidade (un)</option>
                                <option value="kg" className="bg-[#1A1614] text-white">Quilo (kg)</option>
                                <option value="lt" className="bg-[#1A1614] text-white">Litro (lt)</option>
                                <option value="sc" className="bg-[#1A1614] text-white">Saco (sc)</option>
                                <option value="cx" className="bg-[#1A1614] text-white">Caixa (cx)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                        >
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
