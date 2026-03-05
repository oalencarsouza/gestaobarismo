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
