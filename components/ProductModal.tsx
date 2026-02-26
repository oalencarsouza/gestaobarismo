import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Product, Category } from '../types';
import { getUniqueCategories } from '../lib/data-utils';
import { useNotification } from '../contexts/NotificationContext';

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
    const { showError } = useNotification();
    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        price: '',
        cost_price: '',
        description: '',
        quantity: '',
        min_quantity: '',
        unit: 'un'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                category_id: initialData.category_id || '',
                price: initialData.price.toString(),
                cost_price: initialData.cost_price ? initialData.cost_price.toString() : '',
                description: initialData.description || '',
                quantity: initialData.stock?.quantity.toString() || '0',
                min_quantity: initialData.stock?.min_quantity.toString() || '5',
                unit: initialData.stock?.unit || 'un'
            });
        } else {
            setFormData({
                name: '',
                category_id: categories[0]?.id || '',
                price: '',
                cost_price: '',
                description: '',
                quantity: '0',
                min_quantity: '5',
                unit: 'un'
            });
        }
    }, [initialData, categories, isOpen]);

    const uniqueCategories = getUniqueCategories(categories);

    if (!isOpen) return null;

    const handlePriceChange = (val: string, field: 'price' | 'cost_price') => {
        let cleaned = val.replace(',', '.').replace(/[^\d.]/g, '');
        const dots = cleaned.split('.').length - 1;
        if (dots > 1) return;

        if (cleaned.includes('.')) {
            const [int, dec] = cleaned.split('.');
            cleaned = `${int}.${dec.slice(0, 2)}`;
        }

        if (parseFloat(cleaned) > 999.99) {
            showError('Valores acima de R$ 999,99 não são válidos.');
            setFormData(prev => ({ ...prev, [field]: '' }));
            return;
        }

        setFormData(prev => ({ ...prev, [field]: cleaned }));
    };

    const handleQuantityChange = (val: string, field: 'quantity' | 'min_quantity') => {
        let cleaned = val.replace(/[^\d]/g, '');
        if (parseInt(cleaned) > 999) {
            showError('Quantidades acima de 999 não são válidas.');
            setFormData(prev => ({ ...prev, [field]: '' }));
            return;
        }
        setFormData(prev => ({ ...prev, [field]: cleaned }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...initialData,
            ...formData,
            price: parseFloat(formData.price) || 0,
            cost_price: parseFloat(formData.cost_price) || 0,
            quantity: parseInt(formData.quantity) || 0,
            min_quantity: parseInt(formData.min_quantity) || 0
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
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-400">Nome do Produto</label>
                            <span className={`text-xs font-mono ${formData.name.length >= 45 ? 'text-red-400' : 'text-gray-600'}`}>{formData.name.length}/45</span>
                        </div>
                        <input
                            required
                            type="text"
                            maxLength={45}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                            placeholder="Ex: Vodka Absolut 1L"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-400">Descrição (Opcional)</label>
                            <span className={`text-xs font-mono ${formData.description.length >= 135 ? 'text-red-400' : 'text-gray-600'}`}>{formData.description.length}/135</span>
                        </div>
                        <input
                            type="text"
                            maxLength={135}
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
                                type="text"
                                value={formData.price}
                                onChange={e => handlePriceChange(e.target.value, 'price')}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none font-numbers"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">Preço Custo (R$) (Opcional)</label>
                            <input
                                type="text"
                                value={formData.cost_price}
                                onChange={e => handlePriceChange(e.target.value, 'cost_price')}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none font-numbers"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2 text-primary">
                            <label className="text-sm font-medium text-gray-400">Qtd. Atual</label>
                            <input
                                required
                                type="text"
                                value={formData.quantity}
                                onChange={e => handleQuantityChange(e.target.value, 'quantity')}
                                className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none font-numbers"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400">Qtd. Mínima</label>
                            <input
                                required
                                type="text"
                                value={formData.min_quantity}
                                onChange={e => handleQuantityChange(e.target.value, 'min_quantity')}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none font-numbers"
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
