import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { Save, Info, Clock, Edit, Camera } from 'lucide-react';

interface DayConfig {
    day: string;
    open: string;
    close: string;
    enabled: boolean;
}

const DayRow: React.FC<{
    config: DayConfig;
    readOnly: boolean;
    onChange: (updated: DayConfig) => void
}> = ({ config, readOnly, onChange }) => (
    <div className={`group flex items-center justify-between gap-4 p-4 rounded-2xl transition-all border ${config.enabled
        ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-primary/30 shadow-sm'
        : 'opacity-40 border-transparent bg-transparent'
        }`}>
        <div className="flex items-center gap-3">
            <div className={`size-2 rounded-full ${config.enabled ? 'bg-primary' : 'bg-slate-700'}`}></div>
            <span className={`text-sm font-black transition-colors min-w-[90px] ${config.enabled ? 'text-white' : 'text-slate-500'}`}>
                {config.day}
            </span>
        </div>

        <div className="flex items-center gap-3">
            {config.enabled ? (
                <div className={`flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-xl border transition-all ${readOnly ? 'border-transparent opacity-80' : 'border-white/5 group-hover:border-primary/20'}`}>
                    <div className="flex flex-col min-w-[58px]">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Abertura</span>
                        <input
                            className={`bg-transparent border-none focus:ring-0 text-sm font-bold text-white p-0 w-full hover:text-primary transition-colors h-5 ${readOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer'}`}
                            type="time"
                            readOnly={readOnly}
                            value={config.open}
                            onChange={(e) => onChange({ ...config, open: e.target.value })}
                        />
                    </div>

                    <div className="h-4 w-px bg-white/10"></div>

                    <div className="flex flex-col min-w-[58px]">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Fechamento</span>
                        <input
                            className={`bg-transparent border-none focus:ring-0 text-sm font-bold text-white p-0 w-full hover:text-primary transition-colors h-5 ${readOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer'}`}
                            type="time"
                            readOnly={readOnly}
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

            {!readOnly && (
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-xl"></div>
                </label>
            )}
        </div>
    </div>
);

export const Profile: React.FC = () => {
    const { showSuccess, showError } = useNotification();
    const userRole = localStorage.getItem('userRole');
    const isAdmin = userRole === 'admin';

    const [establishmentName, setEstablishmentName] = useState("GESBAR");
    const [bannerUrl, setBannerUrl] = useState("https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop");
    const [logoUrl, setLogoUrl] = useState("/logo.svg");

    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const handleImageUpload = (type: 'banner' | 'logo') => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                // In a real app, you would upload to Supabase Storage here
                // For now, we'll create a local preview URL
                const url = URL.createObjectURL(file);
                if (type === 'banner') setBannerUrl(url);
                else setLogoUrl(url);
                showSuccess('Imagem carregada com sucesso!');
            }
        };
        input.click();
    };

    const [hours, setHours] = useState<DayConfig[]>([
        { day: "Segunda", open: "17:00", close: "23:30", enabled: true },
        { day: "Terça", open: "17:00", close: "23:30", enabled: true },
        { day: "Quarta", open: "17:00", close: "23:30", enabled: true },
        { day: "Quinta", open: "17:00", close: "23:30", enabled: true },
        { day: "Sexta", open: "17:00", close: "01:00", enabled: true },
        { day: "Sábado", open: "12:00", close: "01:00", enabled: true },
        { day: "Domingo", open: "17:00", close: "23:30", enabled: true },
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
        if (!isAdmin) return;
        setIsSaving(true);
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800));
            localStorage.setItem('businessHours', JSON.stringify(hours));
            showSuccess('Configurações salvas com sucesso!');
            setIsEditing(false);
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
        <main className="max-w-full overflow-x-hidden min-w-0 md:max-w-[1280px] mx-auto pb-12 w-full animate-in fade-in duration-500">
            {/* Banner Section */}
            <div className="relative w-full h-64 md:h-80 group overflow-hidden rounded-b-[2rem] shadow-2xl">
                <div
                    className="absolute inset-0 bg-slate-300 dark:bg-white/5 bg-cover bg-center"
                    style={{
                        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.8)), url("${bannerUrl}")`
                    }}
                ></div>

                <button
                    onClick={() => handleImageUpload('banner')}
                    className="absolute top-6 right-6 bg-black/50 hover:bg-primary text-white px-5 py-2.5 rounded-xl backdrop-blur-md flex items-center gap-2 text-sm font-bold transition-all border border-white/10 active:scale-95 shadow-xl z-20 opacity-0 group-hover:opacity-100"
                >
                    <Edit size={18} /> Alterar Capa
                </button>

                <div className="absolute -bottom-16 left-6 md:left-10 flex items-end gap-4 md:gap-6 z-10">
                    <div className="relative group/avatar">
                        <div className="size-28 md:size-44 rounded-full border-4 border-[#120f0e] overflow-hidden bg-[#1a1614] shadow-2xl relative flex items-center justify-center">
                            <img
                                className="w-full h-full object-cover"
                                src={logoUrl}
                                alt="Profile"
                            />
                            <button
                                onClick={() => handleImageUpload('logo')}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            >
                                <Camera className="text-white" size={32} />
                            </button>
                        </div>
                        <button
                            onClick={() => handleImageUpload('logo')}
                            className="absolute bottom-1 md:bottom-2 right-1 md:right-2 size-8 md:size-11 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 hover:scale-110 active:scale-90 transition-all border-2 border-[#120f0e] z-20"
                        >
                            <Camera size={16} />
                        </button>
                    </div>
                    <div className="pb-20 mb-2 md:mb-4">
                        <h1 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg tracking-tight uppercase">{establishmentName}</h1>
                        <p className="text-primary font-bold flex items-center gap-2 text-sm md:text-lg">
                            <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
                            Bebidas & Porções
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-24 px-4 md:px-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10 shadow-xl backdrop-blur-sm h-full flex flex-col">
                    <h3 className="text-xl font-black flex items-center gap-3 mb-8 text-white">
                        <div className="p-2 bg-primary/20 rounded-lg"><Info className="text-primary" size={24} /></div>
                        Informações Gerais
                    </h3>
                    <div className="space-y-6 flex-1">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome do Estabelecimento</label>
                            <input
                                type="text"
                                readOnly={!isEditing || !isAdmin}
                                value={establishmentName}
                                onChange={(e) => setEstablishmentName(e.target.value)}
                                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white transition-all outline-none ${isEditing && isAdmin ? 'border-primary/50 focus:ring-1 focus:ring-primary/20' : 'border-white/10'}`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">CNPJ</label>
                            <input
                                type="text"
                                readOnly={!isEditing || !isAdmin}
                                placeholder="00.000.000/0000-00"
                                defaultValue=""
                                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-slate-600 transition-all outline-none ${isEditing && isAdmin ? 'border-primary/50 focus:ring-1 focus:ring-primary/20' : 'border-white/10'}`}
                            />
                        </div>
                    </div>
                </section>

                <section className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10 shadow-xl backdrop-blur-sm h-full flex flex-col lg:sticky lg:top-8">
                    <h3 className="text-xl font-black flex items-center gap-3 mb-8 text-white">
                        <div className="p-2 bg-primary/20 rounded-lg"><Clock className="text-primary" size={24} /></div>
                        Horário de Funcionamento
                    </h3>
                    <div className="flex flex-col gap-3 flex-1">
                        {hours.map((dayConfig, idx) => (
                            <DayRow
                                key={dayConfig.day}
                                config={dayConfig}
                                readOnly={!isEditing || !isAdmin}
                                onChange={(updated) => updateDay(idx, updated)}
                            />
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-4">
                        {isAdmin ? (
                            <button
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                disabled={isSaving}
                                className={`w-full ${isEditing ? 'bg-primary hover:bg-orange-600' : 'bg-white/5 hover:bg-white/10 border border-white/10'} text-white px-8 py-4 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 group`}
                            >
                                {isSaving ? (
                                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        {isEditing ? (
                                            <>
                                                <Save size={20} className="group-hover:rotate-12 transition-transform" />
                                                Confirmar Alterações
                                            </>
                                        ) : (
                                            <>
                                                <Edit size={20} className="group-hover:scale-110 transition-transform text-primary" />
                                                Editar Perfil (Admin)
                                            </>
                                        )}
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="h-4"></div>
                        )}
                    </div>
                </section>
            </div>

            <footer className="mt-12 text-center">
                <p className="text-[10px] text-slate-600 font-medium uppercase tracking-[0.2em] opacity-80 backdrop-blur-sm">
                    ATUALIZADO CONFORME PADRÃO DO ESTABELECIMENTO
                </p>
            </footer>
        </main>
    );
};
