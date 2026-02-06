
import React from 'react';
import { Footer } from '../Footer';

export const Events: React.FC = () => {
    return (
        <main className="flex-1 flex flex-col px-4 lg:px-40 py-8 gap-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">Gestão de Eventos</h1>
                    <p className="text-slate-500 dark:text-[#cba990] text-lg font-normal leading-normal">Planeje ocasiões especiais e crie cardápios temáticos exclusivos.</p>
                </div>
                <button className="flex min-w-[160px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal transition-transform active:scale-95 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined">add_circle</span>
                    <span className="truncate">Criar Novo Evento</span>
                </button>
            </div>

            <div className="border-b border-slate-200 dark:border-[#493222]">
                <div className="flex gap-8">
                    <a className="flex flex-col items-center justify-center border-b-[3px] border-b-primary text-primary pb-[13px] pt-4 px-2" href="#">
                        <p className="text-sm font-bold leading-normal tracking-[0.015em]">Todos os Eventos</p>
                    </a>
                    <a className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-slate-500 dark:text-[#cba990] pb-[13px] pt-4 px-2 hover:text-slate-900 dark:hover:text-white transition-colors" href="#">
                        <p className="text-sm font-bold leading-normal tracking-[0.015em]">Ativos</p>
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-8 flex flex-col gap-6">
                    <h3 className="text-slate-900 dark:text-white text-xl font-bold">Eventos em Destaque</h3>
                    <div className="flex flex-col rounded-xl overflow-hidden shadow-xl bg-white dark:bg-[#342418] border border-slate-100 dark:border-[#493222] transition-all hover:border-primary/50">
                        <div className="flex flex-col md:flex-row">
                            <div
                                className="md:w-1/3 bg-center bg-no-repeat aspect-video md:aspect-auto bg-cover"
                                style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuAxxb-yZfvKBTm6E36ANJGxwqSzLh15kfaUY3RAl19gxALtfOiDu7yEoNddh4QFohflV0OMmPni-kHEC55h8_88MmDAeUKr9_fMTh3F3pvJj1TqAvKGFI3ZpgnPuEAgcycrNtrNCjumZv_g96h9YTjcI2hwCJp5_rjNkTUuOxN0CZ8DqHUmHyLYNGqd1IyXypsh4aSeeneyukD2xxUqzNDg2yGcNcHRVpR1DJ114MMK-GCP7WfEc0FlZl08L-mMiQITAerZ0AjBHRg")` }}
                            />
                            <div className="flex-1 p-6 flex flex-col gap-4">
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary mb-2 w-fit">ATIVO</span>
                                <h4 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight">Halloween Night</h4>
                                <p className="text-slate-600 dark:text-slate-300 text-base">Uma celebração assustadora com coquetéis temáticos, decoração imersiva e DJ set especial.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-4 flex flex-col gap-8">
                    <div className="bg-white dark:bg-[#342418] rounded-xl p-6 border border-slate-100 dark:border-[#493222] shadow-xl">
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">auto_awesome</span> Item em Destaque: Lua Cheia
                        </h3>
                        <div
                            className="aspect-square w-full rounded-lg bg-center bg-cover mb-4 relative group"
                            style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCQ91L0UN5NEWe3qylHrqIlXnnBlLhOC4lcO-0Uo_clrxVYU_0Spt9hPPYx1NEcvs7GQcpJjYme819ub1DhIk6XjTVxhFj53YCxfGtRUn9-trxUu1RNddpmZCqcKvn-PK-EHoUPBzvlOOTGJQd7LPNTSoGin2yqDxgc3djQO4RGUtEPLKEzrWwFDBAN59rYP8g09CqEg_YdK2g-ryI7yd_ANj9tVlUktfQq4Qq49CHCTXqp_OfktoOmqFA2ixC6_E8k6Oiq27kPDNk")` }}
                        />
                        <p className="text-primary font-bold">R$ 38,00</p>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
};
