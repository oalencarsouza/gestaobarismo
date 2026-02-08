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
