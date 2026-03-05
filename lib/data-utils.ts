import type { Category } from '../types';

/**
 * Removes duplicate categories from a list based on their name.
 * Useful when the database contains duplicate entries for the same category name.
 */
export const getUniqueCategories = (categories: Category[]): Category[] => {
    return categories.reduce((acc, current) => {
        const x = acc.find(item => item.name.trim().toLowerCase() === current.name.trim().toLowerCase());
        if (!x) {
            return acc.concat([current]);
        } else {
            return acc;
        }
    }, [] as Category[]);
};

/**
 * Retorna a data de "referência" para um pedido, considerando que o dia de bar
 * só "vira" após as 05:00 da manhã.
 */
export const getBusinessDate = (date: Date | string): string => {
    const d = new Date(date);
    // Se for antes das 5 da manhã, pertence ao dia calander anterior
    if (d.getHours() < 5) {
        d.setDate(d.getDate() - 1);
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Retorna o nome do dia da semana de "referência".
 */
export const getBusinessWeekday = (date: Date | string): string => {
    const d = new Date(date);
    if (d.getHours() < 5) {
        d.setDate(d.getDate() - 1);
    }
    return d.toLocaleDateString('pt-BR', { weekday: 'long' });
};

/**
 * Retorna o intervalo de tempo para um dia de serviço (business day).
 * Ex: Sexta-feira = Sexta 05:00 até Sábado 04:59:59.
 */
export const getBusinessDayRange = (date: Date) => {
    const start = new Date(date);
    start.setHours(5, 0, 0, 0);

    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    end.setHours(4, 59, 59, 999);

    return { start, end };
};

/**
 * Verifica se uma data/hora está dentro do horário de funcionamento configurado.
 */
export const isWithinOperatingHours = (date: Date | string, businessHours: any[]): boolean => {
    const d = new Date(date);
    const hour = d.getHours();
    const minute = d.getMinutes();
    const currentTimeMinutes = hour * 60 + minute;

    // Determinar qual o dia da semana "de negócio"
    const refDate = new Date(d);
    if (hour < 5) refDate.setDate(refDate.getDate() - 1);

    const dayName = refDate.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1).split('-')[0];

    // Buscar a config para esse dia
    const config = businessHours.find(h => h.day.startsWith(capitalizedDay));
    if (!config || !config.enabled) return false;

    const [openH, openM] = config.open.split(':').map(Number);
    const [closeH, closeM] = config.close.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    let closeMinutes = closeH * 60 + closeM;

    // Se o fechamento for menor que a abertura (ex: fecha 01:00 am), soma 24h
    if (closeMinutes <= openMinutes) {
        closeMinutes += 24 * 60;
    }

    // Se a hora atual for madrugada e pertence ao dia anterior, soma 24h para comparar
    let adjustedCurrentMinutes = currentTimeMinutes;
    if (hour < 5) {
        adjustedCurrentMinutes += 24 * 60;
    }

    return adjustedCurrentMinutes >= openMinutes && adjustedCurrentMinutes <= closeMinutes;
};
