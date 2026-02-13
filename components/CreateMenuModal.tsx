
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { Loader2, Coffee, Percent, Copy, Sparkles } from 'lucide-react';
import type { Menu, MenuType } from '../types';

interface CreateMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    menuToEdit?: Menu | null;
}

const MENU_TYPES: { value: MenuType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
    {
        value: 'tradicional',
        label: 'Tradicional',
        description: 'Preços normais, sem desconto',
        icon: <Coffee size={22} />,
        color: 'orange',
    },
    {
        value: 'desconto',
        label: 'Desconto',
        description: 'Desconto global em todos os itens',
        icon: <Percent size={22} />,
        color: 'green',
    },
    {
        value: 'quantidade',
        label: 'Quantidade',
        description: 'Pague 1, Leve 2',
        icon: <Copy size={22} />,
        color: 'blue',
    },
    {
        value: 'especial',
        label: 'Especial',
        description: 'Itens avulsos para eventos',
        icon: <Sparkles size={22} />,
        color: 'purple',
    },
];

const colorMap: Record<string, { bg: string; border: string; text: string; ring: string }> = {
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-400', ring: 'ring-orange-500/30' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400', ring: 'ring-blue-500/30' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400', ring: 'ring-purple-500/30' },
};

export const CreateMenuModal: React.FC<CreateMenuModalProps> = ({ isOpen, onClose, onSuccess, menuToEdit }) => {
    const { showSuccess, showError } = useNotification();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<MenuType>('tradicional');
    const [discountPercent, setDiscountPercent] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (menuToEdit) {
                setName(menuToEdit.name);
                setDescription(menuToEdit.description || '');
                setType(menuToEdit.type || 'tradicional');
                setDiscountPercent(menuToEdit.discount_percent ? menuToEdit.discount_percent.toString() : '');
            } else {
                resetForm();
            }
        }
    }, [isOpen, menuToEdit]);

    const resetForm = () => {
        setName('');
        setDescription('');
        setType('tradicional');
        setDiscountPercent('');
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation only if creating new (since editing keeps existing type)
        if (!menuToEdit && type === 'desconto' && (!discountPercent || parseFloat(discountPercent) <= 0)) {
            showError('Informe o percentual de desconto.');
            return;
        }

        setLoading(true);

        try {
            if (menuToEdit) {
                // Update only name and description as requested
                const { error } = await supabase
                    .from('menus')
                    .update({ name, description })
                    .eq('id', menuToEdit.id);

                if (error) throw error;
                showSuccess('Cardápio atualizado com sucesso!');
            } else {
                // Create new menu
                const { error } = await supabase
                    .from('menus')
                    .insert([{
                        name,
                        description,
                        active: true,
                        type,
                        discount_percent: type === 'desconto' ? parseFloat(discountPercent) : null,
                    }]);

                if (error) throw error;
                showSuccess('Cardápio criado com sucesso!');
            }

            onSuccess();
            onClose();
            if (!menuToEdit) resetForm();
        } catch (error) {
            console.error('Erro ao salvar cardápio:', error);
            showError('Erro ao salvar o cardápio. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1e140f] rounded-xl shadow-2xl w-full max-w-lg border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">
                        {menuToEdit ? 'Editar Cardápio' : 'Criar Novo Cardápio'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Menu Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Nome do Cardápio <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Happy Hour, Cardápio de Verão..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>

                    {/* Menu Type Selection - Only visible when creating */}
                    {!menuToEdit && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Tipo do Cardápio <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {MENU_TYPES.map((mt) => {
                                    const isSelected = type === mt.value;
                                    const c = colorMap[mt.color];
                                    return (
                                        <button
                                            key={mt.value}
                                            type="button"
                                            onClick={() => setType(mt.value)}
                                            className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 transition-all text-left ${isSelected
                                                    ? `${c.bg} ${c.border} ring-2 ${c.ring}`
                                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className={`flex items-center gap-2 ${isSelected ? c.text : 'text-gray-400'}`}>
                                                {mt.icon}
                                                <span className="font-bold text-sm">{mt.label}</span>
                                            </div>
                                            <span className="text-[11px] text-gray-500 leading-tight">{mt.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Type display when editing (readonly) */}
                    {menuToEdit && (
                        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-1">Tipo de Cardápio</span>
                            <div className="flex items-center gap-2 text-white font-medium">
                                {MENU_TYPES.find(t => t.value === menuToEdit.type)?.icon}
                                <span>{MENU_TYPES.find(t => t.value === menuToEdit.type)?.label}</span>
                                {menuToEdit.type === 'desconto' && (
                                    <span className="text-emerald-400 text-sm">({menuToEdit.discount_percent}%)</span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">O tipo do cardápio não pode ser alterado.</p>
                        </div>
                    )}

                    {/* Discount Percent (only for 'desconto' type creation) */}
                    {!menuToEdit && type === 'desconto' && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Percentual de Desconto <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    step="1"
                                    required
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(e.target.value)}
                                    placeholder="Ex: 10"
                                    className="w-full bg-white/5 border border-emerald-500/30 rounded-lg px-4 py-2 pr-10 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold">%</span>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Descrição (Opcional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descrição breve deste cardápio..."
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600 resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            {menuToEdit ? 'Salvar Alterações' : 'Criar Cardápio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
