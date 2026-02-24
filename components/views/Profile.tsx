import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { Save, Info, MapPin, Clock, Edit, Camera } from 'lucide-react';

interface DayConfig {
    day: string;
    open: string;
    close: string;
    enabled: boolean;
}

const DayRow: React.FC<{
    config: DayConfig;
    onChange: (updated: DayConfig) => void
}> = ({ config, onChange }) => (
    <div className={`group flex items-center justify-between gap-4 p-4 rounded-2xl transition-all border ${config.enabled
        ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-primary/30 shadow-sm'
        : 'opacity-40 border-transparent bg-transparent'
        }`}>
        <div className="flex items-center gap-3">
            <div className={`size-2 rounded-full ${config.enabled ? 'bg-primary' : 'bg-slate-700'}`}></div>
            <span className={`text-sm font-black transition-colors min-w-[100px] ${config.enabled ? 'text-white' : 'text-slate-500'}`}>
                {config.day}
            </span>
        </div>

        <div className="flex items-center gap-6">
            {config.enabled ? (
                <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-xl border border-white/5 group-hover:border-primary/20 transition-all">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Abertura</span>
                        <input
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-white p-0 w-16 cursor-pointer hover:text-primary transition-colors h-5"
                            type="time"
                            value={config.open}
                            onChange={(e) => onChange({ ...config, open: e.target.value })}
                        />
                    </div>

                    <div className="h-4 w-px bg-white/10 mx-1"></div>

                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Fechamento</span>
                        <input
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-white p-0 w-16 cursor-pointer hover:text-primary transition-colors h-5"
                            type="time"
                            value={config.close}
                            onChange={(e) => onChange({ ...config, close: e.target.value })}
                        />
                    </div>
                </div>
            ) : (
                <div className="flex-1 text-right">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">Fechado</span>
                </div>
            )}

            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-xl"></div>
            </label>
        </div>
    </div>
);

export const Profile: React.FC = () => {
    const { showSuccess, showError } = useNotification();
    const [isSaving, setIsSaving] = useState(false);
    const [hours, setHours] = useState<DayConfig[]>([
        { day: "Segunda", open: "12:00", close: "02:00", enabled: true },
        { day: "Terça", open: "12:00", close: "02:00", enabled: true },
        { day: "Quarta", open: "12:00", close: "02:00", enabled: true },
        { day: "Quinta", open: "12:00", close: "02:00", enabled: true },
        { day: "Sexta", open: "12:00", close: "02:00", enabled: true },
        { day: "Sábado", open: "12:00", close: "02:00", enabled: true },
        { day: "Domingo", open: "12:00", close: "02:00", enabled: true },
    ]);

    useEffect(() => {
        const savedHours = localStorage.getItem('businessHours');
        if (savedHours) {
            try {
                setHours(JSON.parse(savedHours));
            } catch (e) {
                console.error("Failed to load hours", e);
            }
        }
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800));
            localStorage.setItem('businessHours', JSON.stringify(hours));
            showSuccess('Configurações salvas com sucesso!');
        } catch (err) {
            showError('Erro ao salvar as configurações.');
        } finally {
            setIsSaving(false);
        }
    };

    const updateDay = (index: number, updated: DayConfig) => {
        const newHours = [...hours];
        newHours[index] = updated;
        setHours(newHours);
    };

    return (
        <main className="max-w-[1280px] mx-auto pb-12 w-full animate-in fade-in duration-500">
            <div className="relative w-full h-64 md:h-80 overflow-hidden group">
                <div className="w-full h-full bg-slate-300 dark:bg-white/5 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.8)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuCgrQgRMIvRG6ijXdN49Uf8iWrzaHnoN7qXSZw7Ns0Ew_oAbWGQFwBbO4EAnQPqPQzf5dCoDJ023MndUBufJv4LaPHo-KTZY1a-g-G7FnMqbOU3LMbnSKPEqvo68DfDYlD78L5BSxUL2aGEXRBo7hI11_hsJ2QAAjV_B6_qcGW4skT1irbx_PlKuHfZV-r1G7mA_FQuxLCBeh1s0dy__Kw2X6f6zxyuEOwgeR5PvZtTd4hL_xoYn-vNla0cpKNWO0vVCWsKs1hQtBg")` }}></div>
                <button className="absolute top-6 right-6 bg-black/50 hover:bg-primary text-white px-5 py-2.5 rounded-xl backdrop-blur-md flex items-center gap-2 text-sm font-bold transition-all border border-white/10 active:scale-95 shadow-xl">
                    <Edit size={18} /> Alterar Capa
                </button>
                <div className="absolute -bottom-16 left-10 flex items-end gap-6">
                    <div className="relative group">
                        <div className="size-32 md:size-44 rounded-full border-4 border-[#120f0e] overflow-hidden bg-slate-800 shadow-2xl relative">
                            <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpmHOj14L-CqSC5zGsaQvY8mkLQ_FaF3q7rbJcY-tOxIgXpB7U22JKyhhCMNkNstI4uMConAvbuqgXpXx2feiAg60gKSn2oOMmtiGYqZ1WYE0b-PgmuVgGs0Wld7VowMrvzU-fFfMgFrfQUCk1tHjhYXFX8YrGWnEVi6t8hLOQanbOYXMqsBwbX5Bo4HZ-ZtWqbt5RZ38YmKiDkDMMkF3yA3miD8pL55YaWgAj58vL5ptgpBuV0Nogaw3MEkrsqjd2zw1RJXp98U4" alt="Profile" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <Camera className="text-white" size={32} />
                            </div>
                        </div>
                        <button className="absolute bottom-2 right-2 size-11 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 hover:scale-110 active:scale-90 transition-all border-2 border-[#120f0e]">
                            <Camera size={20} />
                        </button>
                    </div>
                    <div className="pb-20 mb-4">
                        <h1 className="text-4xl font-black text-white drop-shadow-lg tracking-tight">The Neon Shaker</h1>
                        <p className="text-primary font-bold flex items-center gap-2 text-lg">
                            <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
                            Cocktail Bar & Lounge
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-24 px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 flex flex-col gap-8">
                    <section className="bg-white/5 rounded-2xl p-8 border border-white/10 shadow-xl backdrop-blur-sm">
                        <h3 className="text-xl font-black flex items-center gap-3 mb-8 text-white">
                            <div className="p-2 bg-primary/20 rounded-lg"><Info className="text-primary" size={24} /></div>
                            Informações Gerais
                        </h3>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Nome do Estabelecimento</label>
                                    <input type="text" defaultValue="The Neon Shaker" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Slug (URL)</label>
                                    <input type="text" defaultValue="the-neon-shaker" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Descrição Curta</label>
                                <textarea rows={3} defaultValue="O melhor do barismo clássico e autoral no coração da cidade. Coquetelaria de alto nível em um ambiente imersivo." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all outline-none resize-none" />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white/5 rounded-2xl p-8 border border-white/10 shadow-xl backdrop-blur-sm">
                        <h3 className="text-xl font-black flex items-center gap-3 mb-8 text-white">
                            <div className="p-2 bg-primary/20 rounded-lg"><MapPin className="text-primary" size={24} /></div>
                            Localização
                        </h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Endereço Completo</label>
                                <input type="text" defaultValue="Rua das Flores, 123 - Centro, São Paulo" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all outline-none" />
                            </div>
                            <div className="aspect-video w-full rounded-2xl bg-slate-800/50 border border-white/10 overflow-hidden relative">
                                <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-bold italic">Visualização do Mapa</div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-8">
                    <section className="bg-white/5 rounded-2xl p-8 border border-white/10 shadow-xl backdrop-blur-sm sticky top-8">
                        <h3 className="text-xl font-black flex items-center gap-3 mb-8 text-white">
                            <div className="p-2 bg-primary/20 rounded-lg"><Clock className="text-primary" size={24} /></div>
                            Horário de Funcionamento
                        </h3>
                        <div className="flex flex-col gap-2">
                            {hours.map((dayConfig, idx) => (
                                <DayRow
                                    key={dayConfig.day}
                                    config={dayConfig}
                                    onChange={(updated) => updateDay(idx, updated)}
                                />
                            ))}
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col gap-4">
                            <div className="flex gap-3">
                                <button className="flex-1 px-4 py-3 rounded-xl text-slate-400 font-bold text-sm hover:bg-white/5 hover:text-white transition-all">
                                    Descartar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-3 bg-primary hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-primary text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                                >
                                    {isSaving ? (
                                        <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Save size={20} className="group-hover:rotate-12 transition-transform" />
                                            Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-slate-500 font-medium uppercase tracking-[0.15em]">
                                ÚLTIMA ATUALIZAÇÃO: HOJE ÀS 12:45
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
};
