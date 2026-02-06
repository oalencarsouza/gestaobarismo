
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { Loader2 } from 'lucide-react';

interface CreateMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateMenuModal: React.FC<CreateMenuModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { showSuccess, showError } = useNotification();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('menus')
                .insert([{ name, description, active: true }]);

            if (error) throw error;

            showSuccess('Cardápio criado com sucesso!');
            onSuccess();
            onClose();
            setName('');
            setDescription('');
        } catch (error) {
            console.error('Erro ao criar cardápio:', error);
            showError('Erro ao criar o cardápio. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1e140f] rounded-xl shadow-2xl w-full max-w-md border border-white/10">
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Criar Novo Cardápio</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                            Criar Cardápio
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
