
import React, { useState } from 'react';
import { X, UserPlus, Loader2, Phone } from 'lucide-react';

interface NewOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (clientName: string, clientPhone: string) => Promise<void>;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
    isOpen, onClose, onSave
}) => {
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const formatPhone = (value: string) => {
        // Remove tudo que não é número
        const numbers = value.replace(/\D/g, '');
        // Formata como (XX) XXXXX-XXXX
        if (numbers.length <= 2) return `(${numbers}`;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        setClientPhone(formatted);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName.trim()) return;

        setLoading(true);
        try {
            await onSave(clientName.trim(), clientPhone.trim());
            setClientName('');
            setClientPhone('');
            onClose();
        } catch {
            // error handled by parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background-dark border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserPlus size={22} className="text-primary" />
                        Novo Pedido
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-400">Nome do Cliente</label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Ex: João, Maria..."
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-gray-600 text-lg"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
                            <Phone size={14} />
                            Telefone do Cliente
                        </label>
                        <input
                            type="tel"
                            required
                            value={clientPhone}
                            onChange={handlePhoneChange}
                            placeholder="(XX) XXXXX-XXXX"
                            maxLength={16}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-gray-600 text-lg"
                        />
                    </div>

                    <div className="flex gap-3 mt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !clientName.trim() || !clientPhone.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                            Criar Pedido
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
