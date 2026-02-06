
import React from 'react';

const DayRow: React.FC<{day:string, open:string, close:string, enabled: boolean}> = ({day, open, close, enabled}) => (
    <div className={`flex items-center justify-between gap-4 p-2 rounded-lg transition-colors ${enabled ? 'hover:bg-slate-50 dark:hover:bg-white/5' : 'opacity-60'}`}>
        <span className="text-sm font-semibold w-24">{day}</span>
        <div className="flex items-center gap-2 flex-1 justify-end">
            {enabled ? (
                <>
                    <input className="bg-transparent border-slate-200 dark:border-white/10 rounded-md text-xs px-2 py-1" type="time" defaultValue={open}/>
                    <span className="text-slate-400">-</span>
                    <input className="bg-transparent border-slate-200 dark:border-white/10 rounded-md text-xs px-2 py-1" type="time" defaultValue={close}/>
                </>
            ) : <span className="text-xs font-medium uppercase tracking-widest text-slate-500">Fechado</span>}
             <label className="relative inline-flex items-center cursor-pointer ml-2">
                <input type="checkbox" defaultChecked={enabled} className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
        </div>
    </div>
);

export const Profile: React.FC = () => {
    return (
        <main className="max-w-[1280px] mx-auto pb-12 w-full">
            <div className="relative w-full h-64 md:h-80 overflow-hidden group">
                <div className="w-full h-full bg-slate-300 dark:bg-white/5 bg-cover bg-center" style={{backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuCgrQgRMIvRG6ijXdN49Uf8iWrzaHnoN7qXSZw7Ns0Ew_oAbWGQFwBbO4EAnQPqPQzf5dCoDJ023MndUBufJv4LaPHo-KTZY1a-g-G7FnMqbOU3LMbnSKPEqvo68DfDYlD78L5BSxUL2aGEXRBo7hI11_hsJ2QAAjV_B6_qcGW4skT1irbx_PlKuHfZV-r1G7mA_FQuxLCBeh1s0dy__Kw2X6f6zxyuEOwgeR5PvZtTd4hL_xoYn-vNla0cpKNWO0vVCWsKs1hQtBg")`}}></div>
                <button className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2 text-sm font-medium transition-all"><span className="material-symbols-outlined text-lg">edit</span> Alterar Capa</button>
                <div className="absolute -bottom-16 left-10 flex items-end gap-6">
                    <div className="relative group">
                        <div className="size-32 md:size-40 rounded-full border-4 border-background-light dark:border-background-dark overflow-hidden bg-slate-200 dark:bg-slate-800"><img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpmHOj14L-CqSC5zGsaQvY8mkLQ_FaF3q7rbJcY-tOxIgXpB7U22JKyhhCMNkNstI4uMConAvbuqgXpXx2feiAg60gKSn2oOMmtiGYqZ1WYE0b-PgmuVgGs0Wld7VowMrvzU-fFfMgFrfQUCk1tHjhYXFX8YrGWnEVi6t8hLOQanbOYXMqsBwbX5Bo4HZ-ZtWqbt5RZ38YmKiDkDMMkF3yA3miD8pL55YaWgAj58vL5ptgpBuV0Nogaw3MEkrsqjd2zw1RJXp98U4"/></div>
                        <button className="absolute bottom-2 right-2 size-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><span className="material-symbols-outlined text-xl">photo_camera</span></button>
                    </div>
                    <div className="pb-18 mb-4">
                        <h1 className="text-3xl font-bold text-white drop-shadow-md">The Neon Shaker</h1><p className="text-slate-200 font-medium">Cocktail Bar & Lounge</p>
                    </div>
                </div>
            </div>
            <div className="mt-20 px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 flex flex-col gap-8">
                    <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-slate-200 dark:border-white/10">
                         {/* General Info */}
                         <h3 className="text-xl font-bold flex items-center gap-2 mb-6"><span className="material-symbols-outlined text-primary">info</span> Informações Gerais</h3>
                         {/* Form fields */}
                    </section>
                    <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-slate-200 dark:border-white/10">
                        {/* Location */}
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-6"><span className="material-symbols-outlined text-primary">location_on</span> Localização</h3>
                        {/* Map and address fields */}
                    </section>
                </div>
                <div className="lg:col-span-5 flex flex-col gap-8">
                    <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-slate-200 dark:border-white/10">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-6"><span className="material-symbols-outlined text-primary">schedule</span> Horário de Funcionamento</h3>
                        <div className="flex flex-col gap-4">
                            <DayRow day="Segunda" open="18:00" close="00:00" enabled={true} />
                            <DayRow day="Terça" open="18:00" close="00:00" enabled={true} />
                            <DayRow day="Quarta" open="18:00" close="01:00" enabled={true} />
                            <DayRow day="Quinta" open="18:00" close="02:00" enabled={true} />
                            <DayRow day="Sexta" open="17:00" close="04:00" enabled={true} />
                            <DayRow day="Domingo" open="" close="" enabled={false} />
                        </div>
                    </section>
                    <section className="bg-white dark:bg-white/5 rounded-xl p-6 border border-slate-200 dark:border-white/10">
                         {/* Social Media */}
                    </section>
                </div>
            </div>
             <div className="mt-12 px-6 lg:px-10 flex justify-end">
                <div className="flex gap-4">
                    <button className="px-8 py-3 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Descartar Alterações</button>
                    <button className="bg-primary hover:bg-orange-600 text-white px-10 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2"><span className="material-symbols-outlined">save</span> Salvar Alterações</button>
                </div>
            </div>
        </main>
    );
};
